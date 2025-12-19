// Debug logout functionality
// Add this to your browser console to test logout

// Test 1: Check if token exists
console.log('Current token:', localStorage.getItem('token'));

// Test 2: Test logout API call directly
fetch('http://localhost:8000/api/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Logout response:', data);
  localStorage.removeItem('token');
  console.log('Token removed, should redirect to login');
})
.catch(error => {
  console.error('Logout error:', error);
});