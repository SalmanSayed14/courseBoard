document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const errorEl = document.getElementById('error');
  const coursesEl = document.getElementById('courses');
  const postsEl = document.getElementById('posts');
  const newPostForm = document.getElementById('newPostForm');
  const newPostButton = document.getElementById('newPostButton');
  const postCourseSelect = document.getElementById('postCourseSelect');
  const modal = document.getElementById('staffControlsModal');
  const openBtn = document.querySelector('.open-modal-btn');
  const closeBtn = document.querySelector('.close-button');
  const form = document.getElementById('createCourseForm');
  const studentControls = document.getElementById('studentControls');
  const courseSelect = document.getElementById('courseSelect');
  const enrollButton = document.getElementById('enrollButton');
  const sidebar = document.querySelector('.sidebar');
  const toggleSidebarBtn = document.querySelector('.toggle-sidebar');

  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  // Show/hide controls based on user type
  if (user.userType === 'STAFF') {
    openBtn.style.display = 'block';
  } else {
    studentControls.style.display = 'block';
    modal.style.display = 'none';
    openBtn.style.display = 'none'; // Hide Create Course button for non-staff
  }

  // Toggle sidebar
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      sidebar.classList.toggle('expanded');
      document.body.classList.toggle('sidebar-expanded');
      toggleSidebarBtn.textContent = sidebar.classList.contains('expanded') ? '←' : '☰';
    });
  }

  // Open modal
  if (openBtn) {
    openBtn.onclick = function() {
      modal.style.display = 'flex';
      errorEl.textContent = '';
    };
  }

  // Close modal
  if (closeBtn) {
    closeBtn.onclick = function() {
      modal.style.display = 'none';
      errorEl.textContent = '';
    };
  }

  // Close modal when clicking outside
  window.onclick = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
      errorEl.textContent = '';
    }
  };

  // Logout
  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  });

  // Fetch and display courses
  async function loadCourses() {
    try {
      console.log('Fetching courses...');
      const response = await fetch('http://localhost:3000/api/courses', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const courses = await response.json();
      console.log('Courses fetched:', courses);
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
        if (!allCoursesResponse.ok) {
          throw new Error(`HTTP error! Status: ${allCoursesResponse.status}`);
        }
        const allCourses = await allCoursesResponse.json();
        courseSelect.innerHTML = allCourses
          .filter(c => !c.enrolledUsers.includes(user._id))
          .map(c => `<option value="${c._id}">${c.courseName}</option>`).join('');
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      errorEl.textContent = 'Error loading courses';
    }
  }

  // Fetch and display posts
  async function loadPosts() {
    try {
      console.log('Fetching posts...');
      const response = await fetch('http://localhost:3000/api/posts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const posts = await response.json();
      console.log('Posts fetched:', posts);
      postsEl.innerHTML = posts.length
        ? posts.map(p => `<div class="post-item">${p.content} (${p.courseId ? 'Course Post' : 'General'})</div>`).join('')
        : 'No posts available';
    } catch (error) {
      console.error('Error loading posts:', error);
      errorEl.textContent = 'Error loading posts';
    }
  }

  // Create course (staff only)
  if (user.userType === 'STAFF') {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const courseName = formData.get('courseName').trim();
      if (!courseName) {
        errorEl.textContent = 'Course name cannot be empty';
        return;
      }
      const data = { courseName };
      try {
        console.log('Creating course:', data);
        const response = await fetch('http://localhost:3000/api/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        console.log('Create course response:', result);
        if (response.ok) {
          alert('Course created!');
          e.target.reset();
          modal.style.display = 'none';
          await loadCourses(); // Ensure courses are reloaded
        } else {
          errorEl.textContent = result.error || 'Failed to create course';
        }
      } catch (error) {
        console.error('Error creating course:', error);
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
        console.log('Enrolling in course:', courseId);
        const response = await fetch(`http://localhost:3000/api/courses/${courseId}/enroll`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const result = await response.json();
        console.log('Enroll response:', result);
        if (response.ok) {
          alert('Enrolled successfully!');
          await loadCourses();
        } else {
          errorEl.textContent = result.error || 'Failed to enroll';
        }
      } catch (error) {
        console.error('Error enrolling in course:', error);
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
      console.log('Creating post:', data);
      const response = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log('Create post response:', result);
      if (response.ok) {
        alert('Post created!');
        e.target.reset();
        newPostForm.classList.remove('active');
        await loadPosts();
      } else {
        errorEl.textContent = result.error || 'Failed to create post';
      }
    } catch (error) {
      console.error('Error creating post:', error);
      errorEl.textContent = 'Error creating post';
    }
  });

  // Initial load
  await loadCourses();
  await loadPosts();
});