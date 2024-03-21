import { unstable_noStore as noStore } from 'next/cache';

import {
  PullRequestReviewSubmittedEvent,
} from '@octokit/webhooks-types';
import { getScore, getLabels } from './pr-message';

import { connect } from '@tidbcloud/serverless'

const conn = connect({ url: process.env.DATABASE_URL })

export async function fetchSortedScores() {
  noStore()

  try {
    const data = await conn.execute(`
      SELECT *, init_score + extra_score as total_score
      FROM scores
      ORDER BY total_score ASC
    `);
    const allItems = data as any[];
    // console.log({ allItems })
    // allItems.sort(
    //   (a, b) => a.init_score + a.extra_score - (b.init_score + b.extra_score)
    // );
    return allItems;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all scores.');
  }
}

export async function fetchFilteredReviews(
  query: string,
  currentPage: number,
  pageSize: number
) {
  noStore()

  const offset = (currentPage - 1) * pageSize;

  try {
    const count = await conn.execute(`SELECT COUNT(*) as count
    FROM reviews
    WHERE
      reviews.pr_author LIKE CONCAT('%', ?, '%') OR
      reviews.pr_reviewer LIKE CONCAT('%', ?, '%') OR
      reviews.pr_title LIKE CONCAT('%', ?, '%')
  `, [query, query, query]) as any[];
    const totalPages = Math.ceil(count[0].count / pageSize);

    const reviews = await conn.execute(`
      SELECT *
      FROM reviews
      WHERE
        reviews.pr_author LIKE CONCAT('%', ?, '%') OR
        reviews.pr_reviewer LIKE CONCAT('%', ?, '%') OR
        reviews.pr_title LIKE CONCAT('%', ?, '%')
      ORDER BY reviews.updated_at DESC
      LIMIT ? OFFSET ?
    `, [query, query, query, pageSize, offset]) as any[];

    return { reviews, totalPages }
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to query reviews.');
  }
}

export async function getScores() {
  try {
    const allItems = await fetchSortedScores()
    const scores = allItems
      .map((i) => `${i.name_in_company}(${i.total_score})`)
      .join(' | ');
    return scores;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all scores.');
  }
}

async function getReviewer(githubId: string) {
  noStore()

  try {
    const user = await conn.execute(`SELECT * FROM scores WHERE github_id = ?`, [githubId]) as any[];
    return user[0];
  } catch (error) {
    console.error('Failed to fetch reviewer:', error);
    throw new Error('Failed to fetch reviewer.');
  }
}

async function insertOrUpdateReview(event: PullRequestReviewSubmittedEvent) {
  noStore()

  const { sender, pull_request } = event;
  const labels = getLabels(pull_request as any);
  const score = getScore(pull_request as any);
  const author = pull_request.user.login;
  const reviewer = sender.login;

  try {
    await conn.execute(`
      INSERT INTO reviews (pr_url, pr_title, pr_labels, pr_score, pr_reviewer, pr_author)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE pr_title = ?, pr_labels = ?, pr_score = ?, updated_at = ?
    `, [pull_request.html_url, pull_request.title, labels.join(','), score, reviewer, author, pull_request.title, labels.join(','), score, new Date().toISOString()]);
  } catch (error) {
    console.error('Failed to update or insert review:', error);
    throw new Error('Failed to update or insert review.');
  }
}

async function getExtraScores(githubId: string) {
  noStore()

  try {
    const extraScores = await conn.execute(`
      SELECT sum(pr_score) as extra_score
      FROM reviews
      WHERE pr_reviewer = ?
    `, [githubId]) as any[];
    return extraScores[0].extra_score;
  } catch (error) {
    console.error('Failed to fetch extra scores:', error);
    throw new Error('Failed to fetch extra scores.');
  }
}

async function updateScore(githubId: string, newExtraScore: number) {
  try {
    await conn.execute(`
      UPDATE scores
      SET extra_score = ?
      WHERE github_id = ?
    `, [newExtraScore, githubId]) as any[];
  } catch (error) {
    console.error('Failed to update score:', error);
    throw new Error('Failed to update score.');
  }
}

export async function saveReview(event: PullRequestReviewSubmittedEvent) {
  const { sender, pull_request } = event;

  // skip merged pr
  if (pull_request.merged_at !== null) {
    return ''
  }
  const reviewer = sender.login;
  const author = pull_request.user.login;
  // skip if reviewer is author
  if (reviewer === author) {
    return ''
  }

  // step 1, find reviewer
  const r = await getReviewer(reviewer)
  if (!r) {
    return '';
  }
  const preExtraScore = r.extra_score;

  // step 2, insert or update review record
  await insertOrUpdateReview(event);

  // step 3, calculate all scores
  const newExtraScore = await getExtraScores(reviewer);

  // step 4, update scores table
  if (preExtraScore !== newExtraScore) {
    await updateScore(reviewer, newExtraScore);

    return `${r.name_in_company} score: ${r.init_score + preExtraScore} --> ${r.init_score + newExtraScore}`;
  }
  return '';
}
