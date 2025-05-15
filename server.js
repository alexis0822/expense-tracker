import express, { json } from 'express';
import { ObjectId } from 'mongodb';
import cors from 'cors';
import { connectToDatabase } from './db.js';

const app = express();
const PORT = 3000;
let db;

// Middleware
const corsOptions = {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};
app.use(cors(corsOptions));
app.use(json());
app.use(express.static('.'));

/**
 * Initialize database with default categories if empty
 * Creates a set of predefined expense categories
 */
async function initializeDatabase() {
    try {
        const categoriesCollection = db.collection('categories');
        const count = await categoriesCollection.countDocuments();
        
        if (count === 0) {
            console.log('Initializing default categories...');
            const defaultCategories = [
                "Automobile", "Entertainment", "Family", "Food", "Health Care",
                "Home Office", "Household", "Insurance", "Loans", "Other",
                "Personal", "Tax", "Travel", "Utilities", "Vacation"
            ];
            
            // Create an array of MongoDB bulk write operations
            // For each category name and its index position:
            // - Creates an insertOne operation
            // - Maps the name to the document
            // - Uses the index as originalId for category reference
            const ops = defaultCategories.map((name, index) => ({
                insertOne: { document: { 
                    name, // The category name
                    originalId: index // Sequential ID (0, 1, 2, etc.)
                }
             }
            }));
            
            await categoriesCollection.bulkWrite(ops);
            console.log('Default categories inserted');
        }
    } catch (err) {
        console.error('Error initializing database:', err);
        throw err;
    }
}

// Validate expense object
function validateExpense(expense) {
    return expense.description && expense.payee && 
           !isNaN(expense.amount) && parseFloat(expense.amount) > 0 &&
           !isNaN(expense.categoryId) && expense.categoryId >= 0;
}


/**
 * API Routes
 * 
 * GET /api/categories
 * Fetch all expense categories
 */
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await db.collection('categories').find({}).toArray();
        res.json(categories); // Ensure each category has an _id field
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

/**
 * GET /api/expenses
 * Fetch all expenses, filtered by category
 */
app.get('/api/expenses', async (req, res) => {
    try {
        const query = {};
        if (req.query.categoryId) {
            query.categoryId = parseInt(req.query.categoryId);
        }
        const expenses = await db.collection('expenses').find(query).toArray();
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching expenses' });
    }
});

/**
 * POST /api/categories
 * Create a new category with auto-incremented ID
 */
app.post('/api/categories', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Category name must be a non-empty string' });
        }

        const categoriesCollection = db.collection('categories');
        const existingCategory = await categoriesCollection.findOne({ name });
        if (existingCategory) {
            return res.status(409).json({ error: 'Category already exists' });
        }

        // Get the next available originalId (auto-increment)
        const lastCategory = await categoriesCollection
            .find()
            .sort({ originalId: -1 })
            .limit(1)
            .toArray();
        const nextId = lastCategory.length > 0 ? lastCategory[0].originalId + 1 : 0;

        const result = await categoriesCollection.insertOne({
            name,
            originalId: nextId
        });

        res.status(201).json({ 
            _id: result.insertedId, 
            name, 
            originalId: nextId 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error adding category' });
    }
});

/**
 * PUT /api/categories/:id
 * Update an existing category by ID
 */
app.put('/api/categories/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name } = req.body;

        // Validate inputs
        if (!ObjectId.isValid(categoryId)) {
            return res.status(400).json({ error: 'Invalid category ID format' });
        }
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Category name is required' });
        }

        // Update in database
        const result = await db.collection('categories').updateOne(
            { _id: new ObjectId(categoryId) },
            { $set: { name } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Category update error:', error);
        res.status(500).json({ 
            error: 'Failed to update category',
            details: error.message 
        });
    }
});

/**
 * POST /api/expenses
 * Create a new expense record
 */
app.post('/api/expenses', async (req, res) => {
    try {
        const newExpense = req.body;
        if (!validateExpense(newExpense)) {
            return res.status(400).json({ error: 'Invalid expense data' });
        }

        newExpense.amount = parseFloat(newExpense.amount).toFixed(2);
        newExpense.categoryId = parseInt(newExpense.categoryId);
        newExpense.createdAt = new Date();

        const result = await db.collection('expenses').insertOne(newExpense);
        res.status(201).json({ ...newExpense, _id: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: 'Error adding expense' });
    }
});

/**
 * PUT /api/expenses/:id
 * Update an existing expense by ID
 */
app.put('/api/expenses/:id', async (req, res) => {
    try {
        const expenseId = req.params.id;
        const updatedExpense = req.body;

        if (!validateExpense(updatedExpense)) {
            return res.status(400).json({ error: 'Invalid expense data' });
        }

        updatedExpense.amount = parseFloat(updatedExpense.amount).toFixed(2);
        updatedExpense.categoryId = parseInt(updatedExpense.categoryId);

        const result = await db.collection('expenses').updateOne(
            { _id: new ObjectId(expenseId) },
            { $set: updatedExpense }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json(updatedExpense);
    } catch (error) {
        res.status(500).json({ error: 'Error updating expense' });
    }
});

/**
 * DELETE /api/categories/:id
 * Delete a category if it has no associated expenses
 */
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Validate ID format
        if (!ObjectId.isValid(categoryId)) {
            return res.status(400).json({ error: 'Invalid category ID format' });
        }

        // Check for expenses using originalId
        const category = await db.collection('categories').findOne(
            { _id: new ObjectId(categoryId) }
        );
        
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const expenseCount = await db.collection('expenses').countDocuments({
            categoryId: category.originalId
        });

        if (expenseCount > 0) {
            return res.status(400).json({
                error: `Category has ${expenseCount} associated expenses`
            });
        }

        // Delete category
        const result = await db.collection('categories').deleteOne({
            _id: new ObjectId(categoryId)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.status(204).end();
    } catch (error) {
        console.error('Category deletion error:', error);
        res.status(500).json({
            error: 'Failed to delete category',
            details: error.message
        });
    }
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense by ID
 */
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const result = await db.collection('expenses').deleteOne(
            { _id: new ObjectId(req.params.id) }
        );
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Error deleting expense' });
    }
});

/**
 * Initialize server and database connection
 * Starts the Express server after establishing DB connection
 */
async function initializeServer() {
    try {
        db = await connectToDatabase();
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log("Succesfully connected to MongoDB");
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

// Start the server
initializeServer();