import { sql } from '@vercel/postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore } from 'next/cache';

import {
  PullRequestReviewSubmittedEvent,
} from '@octokit/webhooks-types';
import { getScore, getLabels } from './pr-message';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore()

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await sql<Revenue>`SELECT * FROM revenue`;

    console.log('Data fetch completed after 3 seconds.');

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore()

  try {
    const data = await sql<LatestInvoiceRaw>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore()

  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore()

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql<InvoicesTable>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore()

  try {
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore()

  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore()

  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore()

  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  noStore()

  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

//---------------------------------------------

export async function fetchScores() {
  noStore()

  try {
    const data = await sql`
      SELECT *
      FROM scores
    `;
    const allItems = data.rows;
    console.log({ allItems })
    allItems.sort(
      (a, b) => a.init_score + a.extra_score - (b.init_score + b.extra_score)
    );
    const scores = allItems
      .map((i) => `${i.name_in_company}(${i.init_score + i.extra_score})`)
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
    const user = await sql`SELECT * FROM scores WHERE github_id = ${githubId}`;
    return user.rows[0];
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
    await sql`
      INSERT INTO reviews (pr_url, pr_title, pr_labels, pr_score, pr_reviewer, pr_author)
      VALUES (${pull_request.html_url}, ${pull_request.title}, ${labels.join(',')}, ${score}, ${reviewer}, ${author})
      ON CONFLICT (pr_url, pr_reviewer)
      DO UPDATE SET pr_title = ${pull_request.title}, pr_labels = ${labels.join(',')}, pr_score = ${score}, updated_at = ${new Date().toISOString()}
    `;
  } catch (error) {
    console.error('Failed to update or insert review:', error);
    throw new Error('Failed to update or insert review.');
  }
}

async function getExtraScores(githubId: string) {
  noStore()

  try {
    const extraScores = await sql`
      SELECT sum(pr_score) as extra_score
      FROM reviews
      WHERE pr_reviewer = ${githubId}
    `;
    return extraScores.rows[0].extra_score;
  } catch (error) {
    console.error('Failed to fetch extra scores:', error);
    throw new Error('Failed to fetch extra scores.');
  }
}

async function updateScore(githubId: string, newExtraScore: number) {
  try {
    await sql`
      UPDATE scores
      SET extra_score = ${newExtraScore}
      WHERE github_id = ${githubId}
    `;
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
