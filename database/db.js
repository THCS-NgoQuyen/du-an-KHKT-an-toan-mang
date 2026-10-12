// ===== database/db.js — SQLite Database for Survey Results =====
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dbDir = __dirname;
const dbPath = path.join(dbDir, 'survey.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Open or create SQLite database
const db = new DatabaseSync(dbPath);

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS survey_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT NOT NULL,
        student_class TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_answered INTEGER NOT NULL,
        risk_score INTEGER NOT NULL,
        answers_json TEXT NOT NULL,
        ip_address TEXT DEFAULT '127.0.0.1'
    );

    CREATE INDEX IF NOT EXISTS idx_student_class ON survey_submissions(student_class);
    CREATE INDEX IF NOT EXISTS idx_submitted_at ON survey_submissions(submitted_at);

    CREATE TABLE IF NOT EXISTS game_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT NOT NULL,
        student_class TEXT NOT NULL,
        score INTEGER NOT NULL,
        wave_reached INTEGER NOT NULL,
        survival_time INTEGER DEFAULT 0,
        kills INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_game_class ON game_scores(student_class);
    CREATE INDEX IF NOT EXISTS idx_game_score ON game_scores(score DESC);
`);

// Initial table creation complete (no virtual/mock seed data)

/**
 * Insert a new survey submission
 */
function insertSubmission({ studentName, studentClass, answers, totalAnswered, riskScore, ipAddress }) {
    const stmt = db.prepare(`
        INSERT INTO survey_submissions 
        (student_name, student_class, submitted_at, total_answered, risk_score, answers_json, ip_address)
        VALUES (?, ?, datetime('now', 'localtime'), ?, ?, ?, ?)
    `);

    const answersStr = typeof answers === 'string' ? answers : JSON.stringify(answers);
    const result = stmt.run(
        studentName.trim(),
        studentClass.trim().toUpperCase(),
        totalAnswered || Object.keys(answers || {}).length,
        riskScore || 0,
        answersStr,
        ipAddress || '127.0.0.1'
    );

    return {
        id: Number(result.lastInsertRowid),
        studentName: studentName.trim(),
        studentClass: studentClass.trim().toUpperCase(),
        totalAnswered,
        riskScore
    };
}

/**
 * Get all survey submissions sorted by latest first
 */
function getAllSubmissions(limit = 100, offset = 0) {
    const stmt = db.prepare(`
        SELECT id, student_name, student_class, submitted_at, total_answered, risk_score, answers_json, ip_address
        FROM survey_submissions
        ORDER BY id DESC
        LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset);
    return rows.map(r => ({
        id: r.id,
        studentName: r.student_name,
        studentClass: r.student_class,
        submittedAt: r.submitted_at,
        totalAnswered: r.total_answered,
        riskScore: r.risk_score,
        answers: JSON.parse(r.answers_json || '{}'),
        ipAddress: r.ip_address
    }));
}

/**
 * Get a single submission by ID
 */
function getSubmissionById(id) {
    const stmt = db.prepare(`
        SELECT id, student_name, student_class, submitted_at, total_answered, risk_score, answers_json, ip_address
        FROM survey_submissions
        WHERE id = ?
    `);
    const r = stmt.get(Number(id));
    if (!r) return null;
    return {
        id: r.id,
        studentName: r.student_name,
        studentClass: r.student_class,
        submittedAt: r.submitted_at,
        totalAnswered: r.total_answered,
        riskScore: r.risk_score,
        answers: JSON.parse(r.answers_json || '{}'),
        ipAddress: r.ip_address
    };
}

/**
 * Get aggregate statistics from database
 */
function getStats() {
    const totalStmt = db.prepare(`SELECT COUNT(*) as total FROM survey_submissions`);
    const total = totalStmt.get().total;

    const classStmt = db.prepare(`
        SELECT student_class, COUNT(*) as count, AVG(risk_score) as avg_risk
        FROM survey_submissions
        GROUP BY student_class
        ORDER BY count DESC
    `);
    const byClass = classStmt.all();

    const avgRiskStmt = db.prepare(`SELECT AVG(risk_score) as avg_risk FROM survey_submissions`);
    const avgRisk = avgRiskStmt.get().avg_risk || 0;

    return {
        totalSubmissions: total,
        byClass,
        avgRisk: Number(avgRisk.toFixed(1))
    };
}

/**
 * Delete a submission by ID
 */
function deleteSubmission(id) {
    const stmt = db.prepare(`DELETE FROM survey_submissions WHERE id = ?`);
    stmt.run(Number(id));
    return { success: true };
}

// Ensure play_count column exists
try {
    db.exec(`ALTER TABLE game_scores ADD COLUMN play_count INTEGER DEFAULT 1`);
} catch (e) {
    // Column already exists
}

/**
 * Insert or update game score (maintains personal best record and prevents duplicate top entries)
 */
function insertGameScore({ studentName, studentClass, score, waveReached, survivalTime, kills }) {
    const name = (studentName || '').trim();
    const sClass = (studentClass || '').trim().toUpperCase();
    const numScore = parseInt(score) || 0;
    const numWave = parseInt(waveReached) || 1;
    const numTime = parseInt(survivalTime) || 0;
    const numKills = parseInt(kills) || 0;

    if (!name || !sClass) {
        throw new Error('Thiếu họ tên hoặc lớp học');
    }

    // Check if student already has a record in the database
    const findStmt = db.prepare(`
        SELECT id, score, wave_reached, survival_time, kills, COALESCE(play_count, 1) as play_count 
        FROM game_scores 
        WHERE LOWER(TRIM(student_name)) = LOWER(?) AND LOWER(TRIM(student_class)) = LOWER(?)
        ORDER BY score DESC 
        LIMIT 1
    `);
    const existing = findStmt.get(name, sClass);

    if (existing) {
        const newPlayCount = (existing.play_count || 1) + 1;
        // If the new score is higher or equal, update with the new record!
        if (numScore >= existing.score) {
            const updateStmt = db.prepare(`
                UPDATE game_scores 
                SET score = ?, wave_reached = ?, survival_time = ?, kills = ?, play_count = ?, created_at = datetime('now', 'localtime')
                WHERE id = ?
            `);
            updateStmt.run(numScore, numWave, numTime, numKills, newPlayCount, existing.id);
            return {
                id: existing.id,
                studentName: name,
                studentClass: sClass,
                score: numScore,
                waveReached: numWave,
                isNewRecord: numScore > existing.score
            };
        } else {
            // Keep personal best score, but update play count
            const updatePlay = db.prepare(`UPDATE game_scores SET play_count = ? WHERE id = ?`);
            updatePlay.run(newPlayCount, existing.id);
            return {
                id: existing.id,
                studentName: name,
                studentClass: sClass,
                score: existing.score,
                waveReached: existing.wave_reached,
                isNewRecord: false
            };
        }
    } else {
        const insertStmt = db.prepare(`
            INSERT INTO game_scores 
            (student_name, student_class, score, wave_reached, survival_time, kills, play_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now', 'localtime'))
        `);
        const res = insertStmt.run(name, sClass, numScore, numWave, numTime, numKills);
        return {
            id: Number(res.lastInsertRowid),
            studentName: name,
            studentClass: sClass,
            score: numScore,
            waveReached: numWave,
            isNewRecord: true
        };
    }
}

/**
 * Get inter-class and individual leaderboard (strictly deduplicated: each student appears only once)
 */
function getGameLeaderboard() {
    // 1. Inter-class aggregation: calculated from the highest score of each unique student in that class
    const classStmt = db.prepare(`
        WITH BestPerStudent AS (
            SELECT 
                student_name,
                student_class,
                MAX(score) as best_score,
                MAX(wave_reached) as best_wave,
                SUM(COALESCE(play_count, 1)) as total_plays
            FROM game_scores
            GROUP BY LOWER(TRIM(student_name)), LOWER(TRIM(student_class))
        )
        SELECT 
            student_class,
            SUM(best_score) as total_score,
            ROUND(AVG(best_score)) as avg_score,
            MAX(best_score) as max_score,
            MAX(best_wave) as max_wave,
            SUM(total_plays) as play_count
        FROM BestPerStudent
        GROUP BY student_class
        ORDER BY total_score DESC, avg_score DESC
    `);
    const classLeaderboard = classStmt.all();

    // 2. Individual top students: DEDUPLICATED - each student appears ONCE with their highest score
    const studentStmt = db.prepare(`
        WITH RankedScores AS (
            SELECT 
                id,
                student_name,
                student_class,
                score,
                wave_reached,
                survival_time,
                kills,
                created_at,
                ROW_NUMBER() OVER (
                    PARTITION BY LOWER(TRIM(student_name)), LOWER(TRIM(student_class)) 
                    ORDER BY score DESC, wave_reached DESC, survival_time DESC, id DESC
                ) as rn
            FROM game_scores
        )
        SELECT 
            id,
            student_name,
            student_class,
            score,
            wave_reached,
            survival_time,
            kills,
            created_at
        FROM RankedScores
        WHERE rn = 1
        ORDER BY score DESC, wave_reached DESC, survival_time DESC
        LIMIT 30
    `);
    const topStudents = studentStmt.all().map(r => ({
        id: r.id,
        studentName: r.student_name,
        studentClass: r.student_class,
        score: r.score,
        waveReached: r.wave_reached,
        survivalTime: r.survival_time,
        kills: r.kills,
        createdAt: r.created_at
    }));

    return {
        classLeaderboard,
        topStudents
    };
}

module.exports = {
    db,
    dbPath,
    insertSubmission,
    getAllSubmissions,
    getSubmissionById,
    getStats,
    deleteSubmission,
    insertGameScore,
    getGameLeaderboard
};

