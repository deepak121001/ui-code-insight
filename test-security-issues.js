// Test file with various security issues for audit testing

// 🔒 Security Issue: Hardcoded secret
const apiKey = "sk-1234567890abcdef";
const password = "mypassword123";
const secret = "super-secret-key";

// 🔒 Security Issue: Unsafe eval usage
eval("console.log('This is dangerous')");
setTimeout("console.log('Also dangerous')", 1000);

// 🔒 Security Issue: XSS vulnerability
document.getElementById('content').innerHTML = userInput;
element.outerHTML = '<div>' + data + '</div>';

// 🔒 Security Issue: SQL injection pattern
const query = `SELECT * FROM users WHERE id = ${userId}`;
const sql = "INSERT INTO table VALUES (" + value + ")";

// Modern practices (good examples)
const modernVariable = "using const";
const arrowFunction = () => console.log("modern arrow function");
const templateLiteral = `Hello ${name}`;

// Async/await (good example)
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

// React hooks (good example)
const [state, setState] = useState(null);
useEffect(() => {
  console.log("effect");
}, []);

// Accessibility issues
const img = <img src="image.jpg" />; // Missing alt
const input = <input type="text" />; // Missing label

// Performance issues
for (let i = 0; i < array.length; i++) { // Traditional for loop
  console.log(array[i]);
}

// Memory leak potential
setInterval(() => {
  console.log("interval");
}, 1000); // No clearInterval

// Testing patterns (good examples)
describe('test suite', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
}); 