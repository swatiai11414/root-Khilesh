const username = "khilesh114";
let canUseApi = true;

// Show and update GitHub API rate limit info in real-time
async function showRateLimitStatus() {
  try {
    const resp = await fetch('https://api.github.com/rate_limit');
    if (!resp.ok) throw new Error('Failed to fetch rate limit');
    const data = await resp.json();

    const core = data.rate ? data.rate : (data.resources ? data.resources.core : {});
    const remaining = core.remaining !== undefined ? core.remaining : 0;
    const limit = core.limit || 60;
    const resetUnix = core.reset || 0;
    const resetDate = new Date(resetUnix * 1000);
    const now = new Date();

    const waitMinutes = Math.max(0, Math.ceil((resetDate - now) / 60000));

    let statusHTML = `
      <strong>Remaining Requests:</strong> ${remaining} / ${limit} <br>
      <strong>Reset Time:</strong> ${resetDate.toLocaleTimeString()}<br>
    `;

    if (remaining === 0) {
      statusHTML += `<span class="error"><strong>Rate limit reached. Please try again after ${waitMinutes} minute(s).</strong></span>`;
      canUseApi = false;
      document.getElementById('profile').textContent =
        "GitHub API rate limit reached. Profile cannot be loaded now.";
      document.getElementById('repo-list').textContent =
        "Repositories cannot be loaded now due to API rate limit. Try again later.";
    } else if (remaining < 5) {
      statusHTML += `<span class="warn">Warning: API limit nearly exhausted.</span>`;
      canUseApi = true;
    } else {
      statusHTML += `<span style="color:#85ff50;">API healthy.</span>`;
      canUseApi = true;
    }

    document.getElementById('ratelimit-info').innerHTML = statusHTML;
  } catch {
    document.getElementById('ratelimit-info').textContent = "Could not fetch rate limit status.";
    canUseApi = true;
  }
}

// Load GitHub profile data dynamically
async function loadProfile() {
  if (!canUseApi) return;
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) throw new Error(`Failed to fetch profile: ${response.status}`);
    const data = await response.json();

    const profileEl = document.getElementById("profile");
    profileEl.innerHTML = `
      <img src="${data.avatar_url}" alt="Profile Picture" />
      <h3>${data.name || data.login}</h3>
      <p>${data.bio || "Tech enthusiast, developer, and content creator."}</p>
      <p>Location: ${data.location || "Unknown"}</p>
      <p>Followers: ${data.followers} | Following: ${data.following}</p>
      <p><a href="${data.html_url}" target="_blank" rel="noopener noreferrer">GitHub Profile</a></p>
    `;
  } catch (error) {
    document.getElementById("profile").textContent = "Failed to load profile.";
    console.error("Error loading profile:", error);
  }
}

// Fetch README.md content of a repository and convert markdown to HTML
async function getRepoReadme(owner, repo) {
  if (!canUseApi) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const decoded = atob(data.content.replace(/\n/g, ""));
    return marked.parse(decoded);
  } catch {
    return null;
  }
}

// Load repos list with README preview or repo description fallback
async function loadRepos() {
  if (!canUseApi) return;
  try {
    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=30&sort=updated`);
    if (!response.ok) throw new Error(`Failed to fetch repos: ${response.status}`);

    const repos = await response.json();
    const repoList = document.getElementById("repo-list");
    repoList.innerHTML = "";

    for (const repo of repos) {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${repo.name}</a>
        <div class="repo-description">Loading README...</div>
        <div class="repo-stats">⭐ ${repo.stargazers_count} | Forks: ${repo.forks_count}</div>
      `;
      repoList.appendChild(listItem);

      const readmeHTML = await getRepoReadme(username, repo.name);
      const descDiv = listItem.querySelector(".repo-description");
      if (readmeHTML) {
        descDiv.innerHTML = readmeHTML;
      } else {
        descDiv.textContent = repo.description || "No description or README.";
      }
    }
  } catch (error) {
    document.getElementById("repo-list").textContent = "Failed to load repositories.";
    console.error("Error loading repositories:", error);
  }
}

// Dynamically add social links
function addSocialLinks() {
  const socials = [
    { name: "Facebook", url: "https://m.facebook.com/profile.php/?id=100075320165786" },
    { name: "Twitter", url: "https://twitter.com/khilesh25321781" },
    { name: "Instagram", url: "https://www.instagram.com/khileshwhite/" },
    { name: "YouTube", url: "https://www.youtube.com/@GitHubGuru" },
    { name: "GitHub", url: "https://github.com/khilesh114" },
  ];

  const container = document.getElementById("social-links");
  container.innerHTML = "";

  socials.forEach(({ name, url }) => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`;
    container.appendChild(li);
  });
}

// Initialization on DOM ready with periodic rate limit refresh
window.addEventListener("DOMContentLoaded", async () => {
  await showRateLimitStatus();

  if (canUseApi) {
    loadProfile();
    loadRepos();
    addSocialLinks();
  }

  setInterval(showRateLimitStatus, 60000); // Refresh rate limit every minute
});
