document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const errorEl = document.getElementById('error');
  const coursesEl = document.getElementById('courses');
  const postsEl = document.getElementById('posts');
  const newPostForm = document.getElementById('newPostForm');
  const newPostButton = document.getElementById('newPostButton');
  const postCourseSelect = document.getElementById('postCourseSelect');
  const staffControls = document.getElementById('staffControls');
  const studentControls = document.getElementById('studentControls');
  const courseSelect = document.getElementById('courseSelect');
  const enrollButton = document.getElementById('enrollButton');

  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  // Show/hide controls based on user type
  if (user.userType === 'STAFF') {
    staffControls.style.display = 'block';
  } else {
    studentControls.style.display = 'block';
  }

  // Logout
  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  });

  // Fetch and display courses
  async function loadCourses() {
    try {
      const response = await fetch('http://localhost:3000/api/courses', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const courses = await response.json();
      coursesEl.innerHTML = courses.length
        ? courses.map(c => `<div class="course-item">${c.courseName}</div>`).join('')
        : 'No courses available';
      // Populate post course select
      postCourseSelect.innerHTML = '<option value="">General Post</option>' +
        courses.map(c => `<option value="${c._id}">${c.courseName}</option>`).join('');
      // Populate enroll course select (students only)
      if (user.userType !== 'STAFF') {
        const allCoursesResponse = await fetch('http://localhost:3000/api/courses', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const allCourses = await allCoursesResponse.json();
        courseSelect.innerHTML = allCourses
          .filter(c => !c.enrolledUsers.includes(user._id))
          .map(c => `<option value="${c._id}">${c.courseName}</option>`).join('');
      }
    } catch (error) {
      errorEl.textContent = 'Error loading courses';
    }
  }

  // Fetch and display posts
  async function loadPosts() {
    try {
      const response = await fetch('http://localhost:3000/api/posts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const posts = await response.json();
      postsEl.innerHTML = posts.length
        ? posts.map(p => `<div class="post-item">${p.content} (${p.courseId ? 'Course Post' : 'General'})</div>`).join('')
        : 'No posts available';
    } catch (error) {
      errorEl.textContent = 'Error loading posts';
    }
  }

  // Create course (staff only)
  if (user.userType === 'STAFF') {
    document.getElementById('createCourseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = { courseName: formData.get('courseName') };
      try {
        const response = await fetch('http://localhost:3000/api/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (response.ok) {
          alert('Course created!');
          e.target.reset();
          loadCourses();
        } else {
          errorEl.textContent = result.error;
        }
      } catch (error) {
        errorEl.textContent = 'Error creating course';
      }
    });
  }

  // Enroll in course (students only)
  if (user.userType !== 'STAFF') {
    enrollButton.addEventListener('click', async () => {
      const courseId = courseSelect.value;
      if (!courseId) {
        errorEl.textContent = 'Select a course to enroll';
        return;
      }
      try {
        const response = await fetch(`http://localhost:3000/api/courses/${courseId}/enroll`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const result = await response.json();
        if (response.ok) {
          alert('Enrolled successfully!');
          loadCourses();
        } else {
          errorEl.textContent = result.error;
        }
      } catch (error) {
        errorEl.textContent = 'Error enrolling in course';
      }
    });
  }

  // Toggle new post form
  newPostButton.addEventListener('click', () => {
    newPostForm.classList.toggle('active');
  });

  // Create post
  newPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      content: formData.get('content'),
      courseId: formData.get('courseId') || undefined,
    };
    try {
      const response = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        alert('Post created!');
        e.target.reset();
        newPostForm.classList.remove('active');
        loadPosts();
      } else {
        errorEl.textContent = result.error;
      }
    } catch (error) {
      errorEl.textContent = 'Error creating post';
    }
  });

  // Initial load
  loadCourses();
  loadPosts();
});