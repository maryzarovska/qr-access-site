const db = require('./database');

console.log('\n=== ALL SUBMISSIONS ===\n');

const submissions = db.prepare(`
    SELECT 
        id,
        name,
        phone,
        token_id,
        submitted_at
    FROM submissions 
    ORDER BY submitted_at DESC
`).all();

if (submissions.length === 0) {
    console.log('No submissions yet.');
} else {
    submissions.forEach(s => {
        console.log('─────────────────────────────────');
        console.log(`ID:        ${s.id}`);
        console.log(`Name:      ${s.name}`);
        console.log(`Phone:     ${s.phone}`);
        console.log(`Token:     ${s.token_id}`);
        console.log(`Submitted: ${s.submitted_at}`);
    });
    console.log('─────────────────────────────────');
    console.log(`\nTotal submissions: ${submissions.length}`);
}

const totalTokens = db.prepare("SELECT COUNT(*) as count FROM tokens").get();
const usedTokens = db.prepare("SELECT COUNT(*) as count FROM tokens WHERE used = 1").get();

console.log('\n=== TOKEN STATS ===');
console.log(`Total tokens generated: ${totalTokens.count}`);
console.log(`Tokens used: ${usedTokens.count}`);
console.log(`Tokens unused/expired: ${totalTokens.count - usedTokens.count}`);

console.log('\n');