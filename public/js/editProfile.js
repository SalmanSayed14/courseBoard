document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const form = document.getElementById('editProfileForm');
  const userTypeSelect = document.getElementById('userTypeSelect');
  const errorEl = document.getElementById('error');

  // Populate form with current user data
  form.firstName.value = user.firstName || '';
  form.lastName.value = user.lastName || '';
  form.email.value = user.email || '';
  form.phone.value = user.phone || '';
  userTypeSelect.value = user.userType || 'STUDENT';

  // Disable userType unless user is STAFF
  if (user.userType !== 'STAFF') {
    userTypeSelect.disabled = true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const formData = new FormData(form);
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      userType: formData.get('userType'),
      password: formData.get('password'),
      repeatPassword: formData.get('repeatPassword'),
    };

    // Remove password fields if empty
    if (!data.password) {
      delete data.password;
      delete data.repeatPassword;
    }

    try {
      const response = await fetch('http://localhost:3000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(result.user));
        alert('Profile updated successfully!');
        window.location.href = '/dashboard.html';
      } else {
        errorEl.textContent = result.error;
      }
    } catch (error) {
      errorEl.textContent = 'Error connecting to server';
    }
  });
});