const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const secretKey = 'your-secret-key'; // Replace with a secure key in production

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files (HTML, CSS, etc.)

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/student-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  userType: { type: String, enum: ['STUDENT', 'STAFF'], required: true },
});

const User = mongoose.model('User', userSchema);

// Course Schema
const courseSchema = new mongoose.Schema({
  courseName: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Staff who created the course
  enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Students enrolled
});

const Course = mongoose.model('Course', courseSchema);

// Post Schema
const postSchema = new mongoose.Schema({
  content: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  createdAt: { type: Date, default: Date.now },
});

const Post = mongoose.model('Post', postSchema);

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Middleware to check if user is STAFF
const isStaff = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.userType !== 'STAFF') {
      return res.status(403).json({ error: 'Staff access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// API Endpoints

// Signup
app.post('/api/signup', async (req, res) => {
  const { firstName, lastName, email, phone, password, repeatPassword, userType } = req.body;

  if (password !== repeatPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (!['STUDENT', 'STAFF'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid user type' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      userType,
    });

    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });
    res.json({
      token,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit Profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  const { firstName, lastName, email, phone, password, repeatPassword, userType } = req.body;

  if (password && password !== repeatPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (userType && !['STUDENT', 'STAFF'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid user type' });
  }

  try {
    const updateData = { firstName, lastName, email, phone };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (userType) {
      const currentUser = await User.findById(req.user.userId);
      if (currentUser.userType !== userType && currentUser.userType !== 'STAFF') {
        return res.status(403).json({ error: 'Only staff can change user type' });
      }
      updateData.userType = userType;
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updateData, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Course (Staff only)
app.post('/api/courses', authenticateToken, isStaff, async (req, res) => {
  const { courseName } = req.body;

  try {
    const course = new Course({
      courseName,
      createdBy: req.user.userId,
      enrolledUsers: [],
    });

    await course.save();
    res.status(201).json({ message: 'Course created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Course Name (Staff only)
app.put('/api/courses/:courseId', authenticateToken, isStaff, async (req, res) => {
  const { courseName } = req.body;
  const courseId = req.params.courseId;

  if (!courseName) {
    return res.status(400).json({ error: 'Course name cannot be empty' });
  }

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only course creator can update course' });
    }

    course.courseName = courseName;
    await course.save();
    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Course (Staff only)
app.delete('/api/courses/:courseId', authenticateToken, isStaff, async (req, res) => {
  const courseId = req.params.courseId;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only course creator can delete course' });
    }

    await Course.deleteOne({ _id: courseId });
    await Post.deleteMany({ courseId }); // Delete associated posts
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Invite Student to Course (Staff only)
app.post('/api/courses/:courseId/invite', authenticateToken, isStaff, async (req, res) => {
  const { email } = req.body;
  const courseId = req.params.courseId;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only course creator can invite students' });
    }

    const student = await User.findOne({ email, userType: 'STUDENT' });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (course.enrolledUsers.includes(student._id)) {
      return res.status(400).json({ error: 'Student already enrolled' });
    }

    course.enrolledUsers.push(student._id);
    await course.save();
    res.json({ message: 'Student invited successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Enroll in Course (Students only)
app.post('/api/courses/:courseId/enroll', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.userType !== 'STUDENT') {
      return res.status(403).json({ error: 'Only students can enroll' });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.enrolledUsers.includes(req.user.userId)) {
      return res.status(400).json({ error: 'Already enrolled' });
    }

    course.enrolledUsers.push(req.user.userId);
    await course.save();
    res.json({ message: 'Enrolled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Courses
app.get('/api/courses', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    let courses;
    if (user.userType === 'STAFF') {
      courses = await Course.find({ createdBy: req.user.userId });
    } else {
      courses = await Course.find({ enrolledUsers: req.user.userId });
    }
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get All Courses (for students to see available courses)
app.get('/api/courses/all', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.userType !== 'STUDENT') {
      return res.status(403).json({ error: 'Only students can view all courses' });
    }
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Post
app.post('/api/posts', authenticateToken, async (req, res) => {
  const { content, courseId } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      if (
        user.userType === 'STUDENT' &&
        !course.enrolledUsers.includes(req.user.userId)
      ) {
        return res.status(403).json({ error: 'Not enrolled in course' });
      }
      if (
        user.userType === 'STAFF' &&
        course.createdBy.toString() !== req.user.userId
      ) {
        return res.status(403).json({ error: 'Not authorized to post in this course' });
      }
    }

    const post = new Post({
      content,
      userId: req.user.userId,
      courseId: courseId || null,
    });

    await post.save();
    res.status(201).json({ message: 'Post created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Posts
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    let posts;
    if (user.userType === 'STAFF') {
      const courses = await Course.find({ createdBy: req.user.userId });
      const courseIds = courses.map(c => c._id);
      posts = await Post.find({
        $or: [{ userId: req.user.userId }, { courseId: { $in: courseIds } }],
      }).sort({ createdAt: -1 });
    } else {
      const courses = await Course.find({ enrolledUsers: req.user.userId });
      const courseIds = courses.map(c => c._id);
      posts = await Post.find({
        $or: [{ userId: req.user.userId }, { courseId: { $in: courseIds } }],
      }).sort({ createdAt: -1 });
    }
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});