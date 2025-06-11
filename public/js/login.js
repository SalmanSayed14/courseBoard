document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';

  const formData = new FormData(e.target);
  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (response.ok) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      window.location.href = '/dashboard.html';
    } else {
      errorEl.textContent = result.error;
    }
  } catch (error) {
    errorEl.textContent = 'Error connecting to server';
  }
});