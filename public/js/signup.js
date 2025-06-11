document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';

  const formData = new FormData(e.target);
  const data = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    userType: formData.get('userType'),
    password: formData.get('password'),
    repeatPassword: formData.get('repeatPassword'),
  };

  try {
    const response = await fetch('http://localhost:3000/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (response.ok) {
      alert('Signup successful! Please log in.');
      window.location.href = '/index.html';
    } else {
      errorEl.textContent = result.error;
    }
  } catch (error) {
    errorEl.textContent = 'Error connecting to server';
  }
});