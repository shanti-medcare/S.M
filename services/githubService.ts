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
  if (!token) return { success: false, message: 'টোকেন পাওয়া যায়নি।' };
  
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });

    if (response.status === 404) {
      return { success: false, message: 'ক্লাউডে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি।' };
    }

    if (!response.ok) {
      const errData = await response.json();
      return { success: false, message: errData.message || 'গিটহাব থেকে ডেটা আনতে সমস্যা হয়েছে।' };
    }

    const data = await response.json();
    
    try {
      if (!data.content) throw new Error("No content in response");
      // GitHub content is base64 encoded, possibly containing newlines
      const base64Content = data.content.replace(/\s/g, '');
      const decodedContent = decodeURIComponent(escape(atob(base64Content)));
      const content = JSON.parse(decodedContent);
      
      return { 
        success: true, 
        message: 'ডেটা সফলভাবে লোড হয়েছে।', 
        data: content,
        sha: data.sha
      };
    } catch (parseError) {
      console.error("Failed to decode or parse GitHub content", parseError);
      return { success: false, message: 'ক্লাউড ফাইলের ডেটা সঠিক ফরম্যাটে নেই।' };
    }
  } catch (error) {
    console.error("GitHub Fetch Error:", error);
    return { success: false, message: 'গিটহাবের সাথে সংযোগ করা সম্ভব হয়নি। ইন্টারনেট কানেকশন চেক করুন।' };
  }
}

export async function uploadToGitHub(token: string, dataToUpload: any, sha?: string): Promise<GitHubSyncResponse> {
  if (!token) return { success: false, message: 'টোকেন প্রদান করুন।' };

  try {
    const jsonStr = JSON.stringify(dataToUpload, null, 2);
    const content = btoa(unescape(encodeURIComponent(jsonStr)));
    
    const body: any = {
      message: `Sync from Shanti Medicare App: ${new Date().toLocaleString('bn-BD')}`,
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
      return { success: true, message: 'ক্লাউড ব্যাকআপ সফল হয়েছে।', sha: result.content.sha };
    } else {
      return { success: false, message: result.message || 'গিটহাব আপলোড ব্যর্থ হয়েছে।' };
    }
  } catch (error) {
    console.error("GitHub Upload Error:", error);
    return { success: false, message: 'নেটওয়ার্ক এরর! ব্যাকআপ নেওয়া সম্ভব হয়নি। ' + (error as any)?.message };
  }
}