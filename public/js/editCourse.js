document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const errorEl = document.getElementById('error');
  const updateCourseForm = document.getElementById('updateCourseForm');
  const inviteStudentForm = document.getElementById('inviteStudentForm');
  const deleteCourseButton = document.getElementById('deleteCourseButton');
  const courseNameInput = document.getElementById('courseName');

  if (!token || user.userType !== 'STAFF') {
    window.location.href = '/index.html';
    return;
  }

  // Get course ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('courseId');
  if (!courseId) {
    errorEl.textContent = 'No course ID provided';
    return;
  }

  // Fetch course details to populate form
  async function loadCourseDetails() {
    try {
      const response = await fetch(`http://localhost:3000/api/courses`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const courses = await response.json();
      const course = courses.find(c => c._id === courseId);
      if (!course) {
        errorEl.textContent = 'Course not found';
        return;
      }
      courseNameInput.value = course.courseName;
    } catch (error) {
      console.error('Error loading course:', error);
      errorEl.textContent = 'Error loading course';
    }
  }

  // Update course name
  updateCourseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      courseName: formData.get('courseName').trim(),
    };
    try {
      const response = await fetch(`http://localhost:3000/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        alert('Course updated successfully!');
        window.location.href = '/dashboard.html';
      } else {
        errorEl.textContent = result.error || 'Failed to update course';
      }
    } catch (error) {
      console.error('Error updating course:', error);
      errorEl.textContent = 'Error updating course';
    }
  });

  // Invite student
  inviteStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      email: formData.get('email'),
    };
    try {
      const response = await fetch(`http://localhost:3000/api/courses/${courseId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        alert('Student invited successfully!');
        e.target.reset();
      } else {
        errorEl.textContent = result.error || 'Failed to invite student';
      }
    } catch (error) {
      console.error('Error inviting student:', error);
      errorEl.textContent = 'Error inviting student';
    }
  });

  // Delete course
  deleteCourseButton.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok) {
        alert('Course deleted successfully!');
        window.location.href = '/dashboard.html';
      } else {
        errorEl.textContent = result.error || 'Failed to delete course';
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      errorEl.textContent = 'Error deleting course';
    }
  });

  // Initial load
  loadCourseDetails();
});