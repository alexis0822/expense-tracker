import { Expense, categoryNames, expenses } from './modules/expense-module.js';
import { load_expenses, save_expenses, add_expense_api, edit_expense_api, delete_expense_api } from './modules/storage-module.js';
import { drawChart } from './modules/chart-module.js';

// API configuration
const API_BASE = 'http://localhost:3000/api';

/*
 * Initial setup when DOM is loaded
 * Initializes the application and sets up event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    populate_category_dropdown();
    
    // Add event listeners
    document.getElementById('add-btn').addEventListener('click', add_expense);
    document.getElementById('add-category-btn').addEventListener('click', addCategory);
    
    // Load initial data
    load_expenses();
});

/*
 * Populates the category dropdown with available expense categories
 * Fetches categories from API if not already loaded
 */
async function populate_category_dropdown() {
    const categorySelect = document.getElementById('expense-category');

    try {
        if (!categoryNames.length) {
            await load_expenses();
        }

        categorySelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.textContent = "Select a category";
        categorySelect.appendChild(defaultOption);

        categoryNames.forEach(category => {
            const option = document.createElement('option');
            option.value = category.originalId;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
} catch (error) {
        console.error("Error loading categories:", error);
        categorySelect.innerHTML = '<option disabled selected>Error loading categories</option>';
    }
}

/*
 * Adds a new expense to the expense tracker
 * Validates input and sends request to API
 */
async function add_expense() {
    // Get the input values
    const description = document.getElementById('expense-name').value.trim();
    const amount = document.getElementById('expense-amount').value;
    const payee = document.getElementById('expense-payee').value.trim();
    const categoryId = document.getElementById('expense-category').value;

    // Validation
    if (!description) {
        alert("Please enter a description");
        return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        alert("Please enter a valid amount greater than 0");
        return;
    }
    if (!payee) {
        alert("Please enter a payee");
        return;
    }
    if (!categoryId || categoryId === "undefined" || categoryId === "") {
        alert("Please select a valid category");
        return;
    }

    try {
        const newExpense = {
            description,
            amount: parseFloat(amount),
            payee,
            categoryId
        };

        const savedExpense = await add_expense_api(newExpense);
        console.log("Expense saved successfully:", savedExpense);
        
        // Clear inputs and refresh expense list
        clear_inputs();
        await display_expenses();
        
        alert("Expense added successfully!");
    } catch (error) {
        console.error("Error details:", error);
        alert("Error adding expense: " + error.message);
    }
}

/*
 * Adds a new category to the expense tracker
 * Validates input and sends POST request to API
 */
async function addCategory() {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) {
        alert('Category name cannot be empty!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (!response.ok) throw new Error('Failed to add category');
        
        const newCategory = await response.json();
        console.log("New category added:", newCategory);
        
        alert('Category added successfully!');
        await loadAndDisplayCategories(); // Refresh the list
        await populate_category_dropdown(); // Update the dropdown
        document.getElementById('new-category-name').value = ''; // Clear input
    } catch (error) {
        console.error('Error adding category:', error);
        alert(`Error: ${error.message}`);
    }
}

// Edits an existing expense
async function edit_expense(categoryId, index) {
    try {
        console.log("Editing expense with categoryId:", categoryId, "and index:", index);
        console.log("Current expenses array:", expenses);

        // Validation
        if (!expenses[categoryId] || !expenses[categoryId][index]) {
            throw new Error("Expense not found");
        }

        const expense = expenses[categoryId][index];
        console.log("Expense found:", expense);

        document.getElementById('expense-name').value = expense.description;
        document.getElementById('expense-amount').value = expense.amount;
        document.getElementById('expense-payee').value = expense.payee;
        document.getElementById('expense-category').value = categoryId;

        await remove_expenses(categoryId, index, false);
    } catch (error) {
        console.error("Error editing expense:", error);
        alert("Error editing expense: " + error.message);
    }
}

// Edit a category (prompt for new name)
async function editCategoryPrompt(categoryId, currentName) {
    const newName = prompt('Edit category name:', currentName);
    if (!newName || newName === currentName) return;

    try {
        // Find category by ID
        const category = categoryNames.find(c => c._id === categoryId);
        if (!category) throw new Error('Category not found');

        const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });

        if (!response.ok) throw new Error('Failed to update category');
        
        // Refresh all data
        await Promise.all([
            load_expenses(),
            loadAndDisplayCategories(),
            populate_category_dropdown()
        ]);
    } catch (error) {
        console.error('Edit error:', error);
        alert(`Error: ${error.message}`);
    }
}

// This function removes an expense from the list
async function remove_expenses(categoryId, index, updateDisplay = true) {
    try {
        // Validate if the expense exists
        if (!Array.isArray(expenses)) {
            throw new Error("Expenses array not initialized");
        }
        
        if (!expenses[categoryId] || !expenses[categoryId][index]) {
            // Refresh data and try again
            await load_expenses();
            
            // Second attempt after refresh
            if (!expenses[categoryId] || !expenses[categoryId][index]) {
                throw new Error("Expense not found after refresh");
            }
        }

       const expense = expenses[categoryId][index];

        if (!expense._id) {
            throw new Error("Missing expense ID");
        }

        await delete_expense_api(expense._id);
        expenses[categoryId].splice(index, 1);
        
        if (updateDisplay) {
            await display_expenses();
        }
        
        return true;
    } catch (error) {
        console.error("Error deleting expense:", error);
        alert(`Failed to delete expense: ${error.message}`);
        return false;
    }
}

// Deletes a category after confirmation
async function deleteCategory(categoryId) {
    if (!confirm('Are you sure? This cannot be undone!')) return;

    try {
        const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete category');
        
        // Refresh all data
        await Promise.all([
            load_expenses(),
            loadAndDisplayCategories(),
            populate_category_dropdown()
        ]);
    } catch (error) {
        console.error('Delete error:', error);
        alert(`Error: ${error.message}`);
    }
}

/*
 * Calculates and displays the total of all expenses
 * Updates the total-expenses element in the DOM
 */
function calculate_total_expenses(){
    let total = 0;
    expenses.forEach(category => {
        if (Array.isArray(category)) {
            category.forEach(expense => {
                total += parseFloat(expense.amount);
            });
        }
    });
    document.getElementById('total-expenses').textContent = total.toFixed(2);
}

/*
 * Displays all expenses grouped by category
 * Creates HTML elements for each expense and updates the UI
 */
async function display_expenses() {
    const expenseList = document.getElementById('expense-list');
    expenseList.innerHTML = '<li>Loading expenses...</li>';

    try{
        // Load expenses from the API
        await load_expenses();
        expenseList.innerHTML = '';

        let noExpenses = true;
        
        // Populate the expense list
        categoryNames.forEach((category, id) => {
            if(expenses[id] && expenses[id].length > 0){
                noExpenses = false;
                const categoryItem = document.createElement('li');
                categoryItem.innerHTML = `<strong>${category.name}</strong>`;

                // Create a sublist for the expenses in this category
                const subList = document.createElement('ul');
                expenses[id].forEach((expense, index) =>{
                    const item = document.createElement('li');
                    item.innerHTML = `
                        ${expense.description}: $${expense.amount} - ${expense.payee}
                        <div>
                            <button onclick="window.editExpense(${id}, ${index})">Edit</button>
                            <button type="button" class="delete-btn" onclick="window.removeExpense(${id}, ${index})">X</button>
                        </div>
                    `;
                    subList.appendChild(item);
                });

                // Append the sublist to the category item
                categoryItem.appendChild(subList);
                expenseList.appendChild(categoryItem);
            }
        });
        
        if (noExpenses) {
            expenseList.innerHTML = '<li>No expenses found.</li>';
        }
        
        calculate_total_expenses();
        drawChart();
    } catch (error){
        console.error('Failed to load expenses:', error);
        expenseList.innerHTML = `<li>Error loading expenses: ${error.message}</li>`;
    }
}

/*
 * Loads and displays all categories in the category management section
 * Creates interactive elements for editing and deleting categories
 */
async function loadAndDisplayCategories() {
    try {
        await load_expenses(); // Ensure the categories are loaded
        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = '';

        categoryNames.forEach(category => {

            if (!category || !category.name) {
                console.warn("Skipping invalid category object:", category);
                return;
            }

            const div = document.createElement('div');
            div.className = 'category-item';
            div.dataset.id = category._id;

            const safeName = String(category.name).replace(/'/g, "\\'");
            div.innerHTML = `
                <span>${category.name}</span>
                <button onclick="window.editCategoryPrompt('${category._id}', '${safeName}')">Edit</button>
                <button onclick="window.deleteCategory('${category._id}')">Delete</button>
            `;
            categoryList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        document.getElementById('category-list').innerHTML = '<div class="error">Error loading categories</div>';
    }
}

/*
 * Clears all input fields in the expense form
 * Reset form to default state
 */
function clear_inputs(){
    document.getElementById('expense-name').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-payee').value = '';
    document.getElementById('expense-category').selectedIndex = 0;
}

/*
 * Main application initialization
 * Sets up event listeners and initializes data
 * Exposes necessary functions to global scope
 */
window.addEventListener('DOMContentLoaded', async() => {
    try {
        // Load data in proper sequence
        await load_expenses();
        await populate_category_dropdown();
        await loadAndDisplayCategories();
        await display_expenses();

        // Set up event listeners
        document.getElementById('expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            add_expense();
        });
        document.getElementById('add-category-btn').addEventListener('click', addCategory);
        document.getElementById('add-btn').addEventListener('click', add_expense);
        
        // Expose functions to global scope
        window.editExpense = async (categoryId, index) => {
            try {
                await edit_expense(categoryId, index);
            } catch (error) {
                console.error("Edit error:", error);
            }
        };

        window.removeExpense = async (categoryId, index) => {
            const success = await remove_expenses(categoryId, index);
            if (!success) {
                console.log("Delete operation failed");
            }
        };
        
        window.editCategoryPrompt = editCategoryPrompt;
        window.deleteCategory = deleteCategory;
    } catch (error) {
        console.error("Initialization error:", error);
        alert("Failed to initialize application. Please check console for details.");
    }
});