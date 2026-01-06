## 网页聊天室（局域网）
### 一、技术应用

**后端**

- **语言**：Node.js
- **框架**：Express.js
- **实时通信**：Socket.IO
- **数据库**：MySQL

**前端**

- **框架**：纯 HTML + CSS + JavaScript

### 二、功能实现

1. 用户

用户进入聊天室后，输入昵称即可开始聊天。昵称无需注册，直接使用。

2. 实时聊天

使用 Socket.IO 实现客户端和服务器之间的实时通信。

3. 历史记录查看

将聊天记录存储在 MySQL 数据库中，用户进入聊天室时加载历史记录。

4. 文件上传与下载

   **文件上传逻辑**：

   - 前端使用 `<input type="file">` 元素来选择文件。
   - 使用 `fetch` API 将文件发送到后端的 `/upload` 路由。
   - 后端使用 `multer` 处理文件上传，并将文件保存到 `uploads/` 目录中。
   - 将文件信息存储到数据库中，并通过 Socket.IO 广播文件上传的消息。

### 三、操作步骤

确保服务器上已安装 Node.js 和 MySQL。然后在项目目录下运行以下命令安装依赖：

`npm install express socket.io mysql2`

部署：

**数据库初始化**

- 确保 MySQL 服务已启动。

  安装：

  sudo apt install mysql-server-8.0

  启动mysql服务：

  sudo systemctl start mysql

  设置MySQL服务开机自启：

  sudo systemctl enable mysql

  Ubuntu 安装 MySQL 后，在 /etc/mysql 目录下有个 debian.cnf，这里存储着默认的密码。要修改 MySQL 密码，需要使用上面的默认密码登录进去，然后跟普通的 MySQL 一样进行修改密码：

  ```bash
  sudo mysql -u root -p
  
  use mysql;
  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
  flush privileges;
  quit;
  ```

  之后即可登录到mysql服务器：

  `mysql -u root -p`

- 初次使用需要先创建数据库：

  ```
  CREATE DATABASE chatroom;
  ```

- 创建数据库和表：

```CREATE DATABASE chatroom;
USE chatroom;
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50),
  message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**运行服务器**

- 将代码文件保存到项目目录中。
- 在项目目录下运行以下命令启动服务器：

`node server.js`

接下来，访问http://<公网ip地址>:3000即可。本地测试时访问[http://localhost:3000]。

### 关于ddns

使用ddns-go。下载适合设备的版本。可使用uname -m查看系统架构

sudo apt install golang-go



在下载好的文件目录处，

tar -zxvf ddns-go_6.9.1_linux_x86_64.tar.gz

./ddns-go



进入127.0.0.1:9876 即可使用ddns-go。

URL写：

http://dynv6.com/api/update?hostname=#{domain}&token=key&ipv6=#{ip}

将 token=key 的 key 替换为 申请Dynv6域名得到的ddclient部分的password=后面的内容，注意不要带单引号。

IPV6部分 domains 设置为自己的域名。



ubuntu的ipv6地址可以ifconfig查看

### 关于终端复用

可以使用tmux：

```
sudo apt-get install tmux
```

tmux new -s name1       # 创建一个新会话

your_command           #在tmux会话中运行你的命令

按Ctrl+b然后按d来脱离会话。

tmux attach -t name1       #可以重新连接到tmux会话



### 关于进程锁

查看进程锁

sudo lsof /var/lib/dpkg/lock-frontend

结束进程，将pid换成上面显示的pid

sudo kill -9 PID



### 安全注意事项

1. **SQL 注入防护**
   - 使用参数化查询（如 `mysql2` 的占位符）来防止 SQL 注入攻击。
2. **XSS 攻击防护**
   - 对用户输入的内容进行过滤和转义，防止跨站脚本攻击（XSS）。可以在前端使用 `textContent` 属性来显示消息内容，避免直接使用 `innerHTML`。

### 异常情况

如果部署时有包缺失，可使用npm install 包名，如

`npm install express`



关于编码，我们使用utf-8，

```sql
-- 修改数据库字符集
ALTER DATABASE chatroom CHARACTER SET utf8 COLLATE utf8_general_ci;

-- 修改表字符集
ALTER TABLE messages CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;
```

对于message，由于文本可能较多，为避免超限，其存储格式应为MEDIUMTEXT或LONGTEXT，而非text。可以通过以下代码修改。

```sql
ALTER TABLE messages MODIFY message MEDIUMTEXT CHARACTER SET utf8 COLLATE utf8_general_ci;
```

上面的操作也可用于处理中文报错的情况。



关于日后可能出现的信息过多，id溢出：

`id` 列通常被定义为 `INT` 类型，其默认范围是 -2,147,483,648 到 2,147,483,647。对于大多数应用程序来说，这个范围是足够的，但在某些高流量的应用中，可能会遇到 `id` 超出范围的问题。解决方案：

1. 使用更大的整数类型

将 `id` 列的类型从 `INT` 改为 `BIGINT`。`BIGINT` 的范围是 -9,223,372,036,854,775,808 到 9,223,372,036,854,775,807（对于有符号整数），或者 0 到 18,446,744,073,709,551,615（对于无符号整数）。

修改表结构：运行以下 SQL 语句将 `id` 列的类型改为 `BIGINT`：

```sql
ALTER TABLE messages MODIFY id BIGINT AUTO_INCREMENT PRIMARY KEY;
ALTER TABLE files MODIFY id BIGINT AUTO_INCREMENT PRIMARY KEY;
```



2. 使用 UUID（Universally Unique Identifier）作为主键。

   UUID 是一个 128 位的唯一标识符，通常以 36 个字符的字符串形式表示（例如 `123e4567-e89b-12d3-a456-426614174000`）。UUID 的优点是几乎不可能重复，但缺点是占用空间更大，且可能影响性能。

修改表结构：运行以下 SQL 语句将 `id` 列的类型改为 `VARCHAR(36)`：

```sql
ALTER TABLE messages MODIFY id VARCHAR(36) PRIMARY KEY;
ALTER TABLE files MODIFY id VARCHAR(36) PRIMARY KEY;
```

修改后端代码：

在插入新记录时，生成一个 UUID：
```javascript
const { v4: uuidv4 } = require('uuid');

// 插入消息
app.post('/message', (req, res) => {
  const { username, message } = req.body;
  const messageId = uuidv4(); // 生成 UUID
  db.query('INSERT INTO messages (id, username, message) VALUES (?, ?, ?)', [messageId, username, message], (err) => {
    if (err) throw err;
    res.send({ message: 'Message saved successfully' });
  });
});

// 插入文件
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const filePath = file.path;
  const fileName = file.filename;
  const fileId = uuidv4(); // 生成 UUID
  db.query('INSERT INTO files (id, filename, path) VALUES (?, ?, ?)', [fileId, fileName, filePath], (err) => {
    if (err) throw err;
    res.send({ message: 'File uploaded successfully' });
  });
});
```

3. 定期清理数据

运行以下 SQL 语句定期清理旧数据：
```sql
DELETE FROM messages WHERE timestamp < NOW() - INTERVAL 1 MONTH;
DELETE FROM files WHERE timestamp < NOW() - INTERVAL 1 MONTH;
```

4. 使用分区表

如果数据量非常大，可以考虑使用分区表。分区表可以将数据分散到多个分区中，从而提高查询性能并避免单个表过大。

创建分区表：

```sql
CREATE TABLE messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  message MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (YEAR(timestamp)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026)
);

CREATE TABLE files (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  path VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (YEAR(timestamp)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026)
);
```



