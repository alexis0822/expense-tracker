import { Expense, categoryNames, expenses } from './expense-module.js';

// API endpoint configuration
const API_BASE = 'http://localhost:3000/api';

/**
 * Function to fetch data from the API
 * url - The endpoint URL to fetch from
 * options - Additional fetch options (method, body, etc.)
 * Returns a parsed JSON response or null for 204 status
 * Throws error if the fetch fails or returns non-OK status
 */
async function fetchData(url, options = {}) {
    try {
        // Makes an HTTP request to the given URL with JSON headers and additional options.
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options,
        });

        if (!response.ok){
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (response.status == 204){
            return null;
        }

        return await response.json();
    } catch (error){
        console.error('Error fetching data:', error);
        throw error;
    }
}

/**
 * Loads all expenses and categories from the API
 * Updates the global categoryNames and expenses arrays
 * Throws error if loading fails
 */
export async function load_expenses() {
    try {
        // Fetch categories
        const categories = await fetchData(`${API_BASE}/categories`);
        
        // Fetch expenses
        const allExpenses = await fetchData(`${API_BASE}/expenses`);

        // Clear previous data
        categoryNames.length = 0;
        expenses.length = 0;

        // Populate categories
        categories.forEach(category => {
            if (category && category.name) {
                categoryNames.push(category);
            }
        });

        // Group expenses by originalId
        const groupedExpenses = {};
        categoryNames.forEach((cat, index) => {
            groupedExpenses[cat.originalId] = index;
            expenses[index] = [];
        });

        allExpenses.forEach(expense => {
            const catIndex = groupedExpenses[expense.categoryId];
            if (catIndex !== undefined) expenses[catIndex].push(expense);
        });

    } catch (error) {
        console.error("Error loading expenses:", error);
        throw error;
    }
}

/**
 * Saves all current expenses to the API
 * Returns true if save was successful
 * Throws error if saving fails
 */
export async function save_expenses() {
    try {
        const updatePromises = expenses.flat().map(expense => 
            edit_expense_api(expense.id, expense)
        );

        await Promise.all(updatePromises);
        return true;
    } catch (error) {
        console.error('Error saving expenses:', error);
        throw error;
    }
}

/**
 * Adds a new expense to the API
 * Returns the created expense object
 * Throws error if validation fails or API request fails
 */
export async function add_expense_api(expense) {
    try {
        // Validation
        if (!expense.description?.trim()) {
            throw new Error('Description is required');
        }
        
        const amount = parseFloat(expense.amount);
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Amount must be a valid positive number');
        }
        
        if (!expense.payee?.trim()) {
            throw new Error('Payee is required');
        }
        
        if (!expense.categoryId || expense.categoryId === "undefined") {
            throw new Error('Valid category selection is required');
        }

        // Create validated expense object
        const validatedExpense = {
            description: expense.description.trim(),
            amount: amount,
            payee: expense.payee.trim(),
            categoryId: expense.categoryId
        };

        // Send request
        const response = await fetch(`${API_BASE}/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(validatedExpense)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${responseData.error || 'Unknown error'}`);
        }

        return responseData;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Updates an existing expense in the API
 * expenseId - ID of the expense to update
 * expenseData - New expense data
 * Returns updated expense object
 * Throws error if update fails
 */
export async function edit_expense_api(expenseId, expenseData) {
    return fetchData(`${API_BASE}/expenses/${expenseId}`, {
        method: 'PUT',
        body: JSON.stringify(expenseData),
    });
}

/**
 * Deletes an expense from the API
 * returns null on successful deletion
 * throws error if deletion fails
 */
export async function delete_expense_api(expenseId) {
    return fetchData(`${API_BASE}/expenses/${expenseId}`, {
        method: 'DELETE',
    });
}