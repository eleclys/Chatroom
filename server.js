const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000; // 使用环境变量 PORT，如果没有设置则默认为 3000

// 静态文件目录
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// uploads 目录作为静态资源目录
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 保存文件的目录
  },
  filename: (req, file, cb) => {
  // 获取上传者的用户名（假设通过 socket.io 传递）
  const username = req.body.username || 'unknown';
  // 获取原始文件名
  const originalName = file.originalname;
  // 获取当前时间戳
  const timestamp = Date.now();
  // 生成新的文件名：用户名_原始文件名_时间戳
  // 使用 encodeURIComponent 对文件名进行编码，以支持中文字符
  const fileName = `${username}_${originalName}_${timestamp}`;
  cb(null, fileName+ path.extname(file.originalname)); // 文件名使用用户名、原始文件名和时间戳
  }
});
const upload = multer({ storage: storage });

// MySQL 数据库连接配置
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'chatroom',
  charset: 'utf8'
});

// 创建数据库和表（如果尚未创建）
db.query('CREATE DATABASE IF NOT EXISTS chatroom CHARACTER SET utf8 COLLATE utf8_general_ci', (err) => {
  if (err) throw err;
  console.log('Database created or already exists');

  // 切换到 chatroom 数据库
  db.query('USE chatroom', (err) => {
    if (err) throw err;

    // 创建 messages 表
    db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) CHARACTER SET utf8 COLLATE utf8_general_ci,
        message MEDIUMTEXT CHARACTER SET utf8 COLLATE utf8_general_ci,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) throw err;

      // 创建 files 表
      db.query(`
        CREATE TABLE IF NOT EXISTS files (
          id INT AUTO_INCREMENT PRIMARY KEY,
          filename VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_general_ci,
          path VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_general_ci,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) throw err;
        console.log('Tables created or already exist');
      });
    });
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// admin路由
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// admin获取所有消息
app.get('/admin/messages', (req, res) => {
  db.query('SELECT * FROM messages ORDER BY timestamp ASC', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// admin获取所有文件
app.get('/admin/files', (req, res) => {
  db.query('SELECT * FROM files ORDER BY timestamp ASC', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// admin删除消息
app.delete('/admin/messages/:id', (req, res) => {
  const messageId = req.params.id;
  // 检查消息是否存在
  db.query('SELECT * FROM messages WHERE id = ?', [messageId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      res.status(404).send({ message: 'Message not found' });
      return;
    }
    // 删除消息
    db.query('DELETE FROM messages WHERE id = ?', [messageId], (err) => {
      if (err) throw err;
      res.send({ message: 'Message deleted successfully' });
    });
  });
});

// admin删除文件
app.delete('/admin/files/:id', (req, res) => {
  const fileId = req.params.id;
  // 检查文件是否存在
  db.query('SELECT * FROM files WHERE id = ?', [fileId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      res.status(404).send({ message: 'File not found' });
      return;
    }
    const filePath = results[0].path;
    // 删除文件
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send({ message: 'Error deleting file' });
        return;
      }
      db.query('DELETE FROM files WHERE id = ?', [fileId], (err) => {
        if (err) throw err;
        res.send({ message: 'File deleted successfully' });
      });
    });
  });
});

// admin一键删除所有消息
app.delete('/admin/messages/all', (req, res) => {
  db.query('DELETE FROM messages', (err) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: 'Error deleting messages' });
      return;
    }
    // 通知所有客户端刷新消息列表
    io.emit('refresh messages');
    res.send({ message: 'All messages deleted successfully' });
  });
});

// admin一键删除所有文件
app.delete('/admin/files/all', (req, res) => {
  db.query('SELECT path FROM files', (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: 'Error retrieving file paths' });
      return;
    }
    results.forEach(result => {
      const filePath = result.path;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(err);
        }
      });
    });
    db.query('DELETE FROM files', (err) => {
      if (err) {
        console.error(err);
        res.status(500).send({ message: 'Error deleting files' });
        return;
      }
      res.send({ message: 'All files deleted successfully' });
    });
  });
});

// 文件上传路由
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const filePath = file.path;
  const fileName = file.filename;

  // 将文件信息存储到数据库
  db.query('INSERT INTO files (filename, path) VALUES (?, ?)', [fileName, filePath], (err) => {
    if (err) throw err;
    io.emit('file uploaded', { filename: fileName, path: filePath });
    res.send({ message: 'File uploaded successfully' });
  });
});

io.on('connection', (socket) => {
  console.log('New client connected');

  // 加载历史聊天记录
  db.query('SELECT * FROM messages ORDER BY timestamp ASC', (err, results) => {
    if (err) throw err;
    socket.emit('load history', results);
  });

  // 加载历史文件记录
  db.query('SELECT * FROM files ORDER BY timestamp ASC', (err, results) => {
    if (err) throw err;
    socket.emit('load files', results);
  });

  socket.on('chat message', (msg) => {
    const { username, message } = msg;
    const maxMessageLength = 16777215; // MEDIUMTEXT 的最大长度
    const truncatedMessage = message.slice(0, maxMessageLength);
    db.query('INSERT INTO messages (username, message) VALUES (?, ?)', [username, truncatedMessage], (err) => {
      if (err) throw err;
      io.emit('chat message', { username, message: truncatedMessage });
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, () => {
  console.log('Server is running on port ${port}');
});