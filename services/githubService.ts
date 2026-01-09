
export interface GitHubSyncResponse {
  success: boolean;
  message: string;
  data?: any;
  sha?: string;
}

const REPO_OWNER = 'shanti-medcare';
const REPO_NAME = 'Sm';
const FILE_PATH = 'orders.json';

export async function fetchFromGitHub(token: string): Promise<GitHubSyncResponse> {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 404) {
      return { success: false, message: 'ফাইলটি গিটহাবে খুঁজে পাওয়া যায়নি।' };
    }

    const data = await response.json();
    const content = JSON.parse(atob(data.content));
    
    return { 
      success: true, 
      message: 'ডেটা সফলভাবে লোড হয়েছে।', 
      data: content,
      sha: data.sha
    };
  } catch (error) {
    return { success: false, message: 'গিটহাবের সাথে সংযোগ করা সম্ভব হয়নি।' };
  }
}

export async function uploadToGitHub(token: string, orders: any[], sha?: string): Promise<GitHubSyncResponse> {
  try {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(orders, null, 2))));
    
    const body: any = {
      message: `Sync orders: ${new Date().toLocaleString()}`,
      content: content,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (response.ok) {
      return { success: true, message: 'ক্লাউড ব্যাকআপ সম্পন্ন হয়েছে।', sha: result.content.sha };
    } else {
      return { success: false, message: result.message || 'আপলোড ব্যর্থ হয়েছে।' };
    }
  } catch (error) {
    return { success: false, message: 'নেটওয়ার্ক এরর!' };
  }
}
