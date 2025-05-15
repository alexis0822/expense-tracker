export const categoryNames = [];  // will store category objects from the API
export const expenses = [];      // will store arrays of expenses per category

export class Expense {
    constructor(amount, payee, categoryId, description, id = null) {
        this.amount = parseFloat(amount).toFixed(2);
        this.payee = payee;
        this.categoryId = categoryId;
        this.description = description;
        this.id = id;
    }
}
