const { db } = require('@vercel/postgres');
const {

  scores,
  reviews
} = require('../app/lib/placeholder-data.js');

const { connect } = require('@tidbcloud/serverless')

//--------------------------------------------------

async function seedScores(client) {
  try {
    await client.execute(`DROP TABLE IF EXISTS scores`);

    // await client.execute(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create the "scores" table if it doesn't exist
    const createTable = await client.execute(`
    CREATE TABLE IF NOT EXISTS scores (
    github_id VARCHAR(100) NOT NULL PRIMARY KEY,
    name_in_company VARCHAR(100) NOT NULL,
    init_score FLOAT NOT NULL,
    extra_score FLOAT NOT NULL
  );
`);

    console.log(`Created "scores" table`);

    // Insert data into the "invoices" table
    const insertedScores = await Promise.all(
      scores.map(
        (score) => client.execute(`
        INSERT INTO scores (github_id, name_in_company, init_score, extra_score)
        VALUES (?, ?, ?, ?)
      `, [score.github_id, score.name_in_company, score.init_score, score.extra_score]),
      ),
    );

    console.log(`Seeded ${insertedScores.length} scores`);

    return {
      createTable,
      scores: insertedScores,
    };
  } catch (error) {
    console.error('Error seeding scores:', error);
    throw error;
  }
}

async function seedReviews(client) {
  try {
    await client.execute(`DROP TABLE IF EXISTS reviews`);

    // await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    // Create the "reviews" table if it doesn't exist
    const createTable = await client.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        pr_url VARCHAR(100) NOT NULL,
        pr_title VARCHAR(255) NOT NULL,
        pr_labels VARCHAR(100) NOT NULL,
        pr_author VARCHAR(100) NOT NULL,
        pr_reviewer VARCHAR(100) NOT NULL,
        pr_score FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_pr_url_reviewer (pr_url, pr_reviewer)
      );
    `);

    console.log(`Created "reviews" table`);

    // Insert data into the "invoices" table
    const insertedReviews = await Promise.all(
      reviews.map(
        (review) => client.execute(`
        INSERT INTO reviews (pr_url, pr_title, pr_labels, pr_author, pr_reviewer, pr_score, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [review.pr_url, review.pr_title, review.pr_labels, review.pr_author, review.pr_reviewer, review.pr_score, review.created_at, review.updated_at]),
      ),
    );

    console.log(`Seeded ${insertedReviews.length} reviews`);

    return {
      createTable,
      reviews: insertedReviews,
    };
  } catch (error) {
    console.error('Error seeding reviews:', error);
    throw error;
  }
}

async function main() {
  // const client = await db.connect();

  const client = connect({ url: process.env.DATABASE_URL })

  // await seedUsers(client);
  // await seedCustomers(client);
  // await seedInvoices(client);
  // await seedRevenue(client);

  await seedScores(client);
  await seedReviews(client);

  // await client.end();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});
