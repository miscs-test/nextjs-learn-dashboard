import {
  PullRequest,
  PullRequestAssignedEvent,
  PullRequestClosedEvent,
  PullRequestEvent,
  PullRequestLabeledEvent,
  PullRequestOpenedEvent,
  PullRequestReopenedEvent,
  PullRequestReviewEvent,
  PullRequestReviewRequestedEvent,
  PullRequestReviewRequestRemovedEvent,
  PullRequestReviewSubmittedEvent,
  PullRequestUnassignedEvent,
  Repository,
  Team,
  User,
} from '@octokit/webhooks-types';

function getUserName(data: User) {
  return `[${data.login}](${data.html_url})`;
}

function getTeamName(data: Team) {
  return `[${data.name}](${data.html_url})`;
}

function getRepoName(data: Repository) {
  return `[${data.name}](${data.html_url})`;
}

function getPullRequestName(data: PullRequest) {
  return `[#${data.number} ${data.title}](${data.html_url})`;
}

export function getLabels(data: PullRequest) {
  return data.labels.map(l => l.name)
}

export function getScore(data: PullRequest) {
  let score = 0.0;
  const types = getLabels(data);
  if (types.includes('epic')) {
    score = 3.0;
  } else if (types.includes('story')) {
    score = 2.0;
  } else if (types.includes('task')) {
    score = 1.0;
    if (types.includes('no-ct')) {
      score = 0.5;
    }
  }
  return score
}

export function getLabelsAndScore(data: PullRequest) {
  return `labels: ${getLabels(data).join(',')}, score: ${getScore(data)}`;
}

class PullRequestHandlers {
  assigned(event: PullRequestAssignedEvent) {
    const { assignee, repository, sender, pull_request } = event;
    const title = `${getRepoName(
      repository
    )}: pull request assigned to ${getUserName(assignee)} by ${getUserName(
      sender
    )}`;
    const text = getPullRequestName(pull_request);
    return [title, text].join('\n');
  }

  unassigned(event: PullRequestUnassignedEvent) {
    const { assignee, repository, sender, pull_request } = event;
    const title = `${getRepoName(
      repository
    )}: pull request unassigned from ${getUserName(assignee)} by ${getUserName(
      sender
    )}`;
    const text = getPullRequestName(pull_request);
    return [title, text].join('\n');
  }

  closed(event: PullRequestClosedEvent) {
    const { repository, sender, pull_request } = event;
    const verb = pull_request.merged ? 'merged' : 'closed';
    const title = `${getRepoName(
      repository
    )}: pull request ${verb} by ${getUserName(sender)}`;
    const text = getPullRequestName(pull_request);

    return [title, text].join('\n');
  }

  opened(event: PullRequestOpenedEvent) {
    const { repository, sender, pull_request } = event;
    const title = `${getRepoName(
      repository
    )}: pull request ${getPullRequestName(
      pull_request
    )} opened by ${getUserName(sender)}`;
    const score = getLabelsAndScore(pull_request);

    return [title, score].join('\n');
  }

  reopened(event: PullRequestReopenedEvent) {
    const { repository, sender, pull_request } = event;
    const title = `${getRepoName(
      repository
    )}: pull request reopened by ${getUserName(sender)}`;
    const text = getPullRequestName(pull_request);
    const score = getLabelsAndScore(pull_request);

    return [title, text, score].join('\n');
  }

  labeled(event: PullRequestLabeledEvent) {
    const { repository, sender, pull_request } = event;
    const title = `${getRepoName(
      repository
    )}: pull request labeled by ${getUserName(sender)}`;
    const text = getPullRequestName(pull_request);
    const score = getLabelsAndScore(pull_request);

    return [title, text, score].join('\n');
  }

  reviewRequested(event: PullRequestReviewRequestedEvent) {
    const { repository, sender, pull_request } = event;
    let reviewer: string;
    if ('requested_reviewer' in event) {
      reviewer = getUserName(event.requested_reviewer);
    } else {
      reviewer = getTeamName(event.requested_team);
    }
    const title = `${getRepoName(repository)}: ${getUserName(
      sender
    )} requested a review from ${reviewer}`;
    const text = getPullRequestName(pull_request);

    return [title, text].join('\n');
  }

  reviewRequestRemoved(event: PullRequestReviewRequestRemovedEvent) {
    const { repository, sender, pull_request } = event;
    let reviewer: string;
    if ('requested_reviewer' in event) {
      reviewer = getUserName(event.requested_reviewer);
    } else {
      reviewer = getTeamName(event.requested_team);
    }
    const title = `${getRepoName(repository)}: ${getUserName(
      sender
    )} removed review request from ${reviewer}`;
    const text = getPullRequestName(pull_request);

    return [title, text].join('\n');
  }

  defaultHandler(event: PullRequestEvent) {
    const { action, repository, sender, pull_request } = event;
    const title = `${getRepoName(
      repository
    )}: pull request ${action} by ${getUserName(sender)}`;
    const text = getPullRequestName(pull_request);

    return [title, text].join('\n');
  }
}

class PullRequestReviewHandlers {
  submitted(event: PullRequestReviewSubmittedEvent) {
    const { repository, sender, pull_request, review } = event;

    const cond1 =
      review.state === 'approved' || review.state === 'changes_requested';
    // const cond2 = review.state === 'commented' && review.body;
    // when commenting with `pull_request_review_comment.created` action, the `review.body` is empty
    const cond2 = review.state === 'commented';
    if (cond1 || cond2) {
      const title = `${getRepoName(repository)}: [#${pull_request.number} ${pull_request.title
        }](${review.html_url}) ${review.state} by ${getUserName(sender)}`;
      const text = `[${pull_request.title}](${review.html_url})\n${review.body || ''}`;
      return [title, text].join('\n');
    }
  }
}

export function pullRequestReview(event: PullRequestReviewEvent) {
  const prr = new PullRequestReviewHandlers();
  switch (event.action) {
    case 'submitted':
      return prr.submitted(event);
    default:
      return;
  }
}

export function pullRequest(event: PullRequestEvent) {
  const pr = new PullRequestHandlers();
  switch (event.action) {
    case 'assigned':
      return pr.assigned(event);
    case 'unassigned':
      return pr.unassigned(event);
    case 'closed':
      return pr.closed(event);
    case 'opened':
      return pr.opened(event);
    case 'reopened':
      return pr.reopened(event);
    case 'labeled':
      return pr.labeled(event);
    // case 'review_requested':
    //   return pr.reviewRequested(event);
    // case 'review_request_removed':
    //   return pr.reviewRequestRemoved(event);
    default:
      return;
  }
}
