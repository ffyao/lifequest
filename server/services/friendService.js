export function createFriendService(database) {
  return {
    search(userId, query) {
      const keyword = normalizeSearchKeyword(query);
      const likeKeyword = `%${escapeLike(keyword)}%`;
      return database
        .prepare(`
          SELECT
            u.id,
            u.username,
            c.avatar,
            c.level,
            c.xp,
            CASE WHEN f.friendId IS NULL THEN 0 ELSE 1 END AS isFriend
          FROM users u
          LEFT JOIN characters c ON c.userId = u.id
          LEFT JOIN friendships f ON f.userId = ? AND f.friendId = u.id
          WHERE u.id <> ?
            AND u.username LIKE ? ESCAPE '\\'
          ORDER BY isFriend DESC, u.username ASC
          LIMIT 10
        `)
        .all(userId, userId, likeKeyword)
        .map(normalizeFriendRow);
    },

    list(userId) {
      return database
        .prepare(`
          SELECT
            u.id,
            u.username,
            c.avatar,
            c.level,
            c.xp,
            f.createdAt
          FROM friendships f
          JOIN users u ON u.id = f.friendId
          LEFT JOIN characters c ON c.userId = u.id
          WHERE f.userId = ?
          ORDER BY f.createdAt DESC, f.id DESC
        `)
        .all(userId)
        .map(normalizeFriendRow);
    },

    add(userId, friendId) {
      const normalizedFriendId = normalizeFriendId(friendId);
      if (normalizedFriendId === Number(userId)) {
        const error = new Error('不能添加自己为好友');
        error.statusCode = 400;
        error.code = 'CANNOT_ADD_SELF';
        throw error;
      }

      const friend = findUser(database, normalizedFriendId);
      if (!friend) {
        const error = new Error('用户不存在');
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
      }

      database
        .prepare('INSERT OR IGNORE INTO friendships (userId, friendId) VALUES (?, ?)')
        .run(userId, normalizedFriendId);

      return normalizeFriendRow(findFriend(database, userId, normalizedFriendId));
    },

    remove(userId, friendId) {
      const normalizedFriendId = normalizeFriendId(friendId);
      const result = database
        .prepare('DELETE FROM friendships WHERE userId = ? AND friendId = ?')
        .run(userId, normalizedFriendId);

      if (result.changes === 0) {
        const error = new Error('好友不存在');
        error.statusCode = 404;
        error.code = 'FRIEND_NOT_FOUND';
        throw error;
      }

      return { deleted: true };
    }
  };
}

function normalizeSearchKeyword(query) {
  const keyword = String(query || '').trim();
  if (keyword.length < 1 || keyword.length > 24) {
    const error = new Error('搜索关键词需要 1 到 24 个字符');
    error.statusCode = 400;
    error.code = 'INVALID_SEARCH_KEYWORD';
    throw error;
  }
  return keyword;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function normalizeFriendId(friendId) {
  const normalizedFriendId = Number(friendId);
  if (!Number.isInteger(normalizedFriendId) || normalizedFriendId <= 0) {
    const error = new Error('好友 ID 必须是正整数');
    error.statusCode = 400;
    error.code = 'INVALID_FRIEND_ID';
    throw error;
  }
  return normalizedFriendId;
}

function findUser(database, userId) {
  return database
    .prepare('SELECT id, username FROM users WHERE id = ?')
    .get(userId);
}

function findFriend(database, userId, friendId) {
  return database
    .prepare(`
      SELECT
        u.id,
        u.username,
        c.avatar,
        c.level,
        c.xp,
        f.createdAt
      FROM friendships f
      JOIN users u ON u.id = f.friendId
      LEFT JOIN characters c ON c.userId = u.id
      WHERE f.userId = ? AND f.friendId = ?
    `)
    .get(userId, friendId);
}

function normalizeFriendRow(row) {
  return {
    ...row,
    id: Number(row.id),
    level: Number(row.level || 1),
    xp: Number(row.xp || 0),
    isFriend: Boolean(row.isFriend)
  };
}
