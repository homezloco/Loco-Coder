// A simple JavaScript counter example

/**
 * Creates a counter object with increment, decrement and reset methods
 * @param {number} initialValue - The starting value for the counter
 * @returns {Object} Counter object with methods
 */
function createCounter(initialValue = 0) {
    let count = initialValue;
    
    return {
        increment: () => ++count,
        decrement: () => --count,
        reset: () => {
            count = initialValue;
            return count;
        },
        getValue: () => count
    };
}

// Create a counter starting at 10
const counter = createCounter(10);

// Demonstrate counter operations
console.log("Initial value:", counter.getValue());

console.log("After increment:", counter.increment());
console.log("After increment again:", counter.increment());

console.log("After decrement:", counter.decrement());

console.log("After reset:", counter.reset());

// Show environment info
console.log("\nEnvironment info:");
console.log("Node.js version:", process.version);
console.log("Platform:", process.platform);
