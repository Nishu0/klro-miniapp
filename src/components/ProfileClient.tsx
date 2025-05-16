"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import Link from "next/link";
import { 
  Github, 
  Globe,
  Share2,
  Copy,
  Check,
  User
} from "lucide-react";
import { api } from "~/lib/axiosClient";
import { useMiniKit, useOpenUrl } from "@coinbase/onchainkit/minikit";

// Format numbers to display with K for thousands, M for millions, etc.
const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  } else {
    return value.toString();
  }
};

// Add interface for ChainData to ensure consistent typing
interface ChainData {
  name: string;
  transactions: number;
  contracts: number;
  score: number;
  firstActivity: string | null;
  tvl: string;
  uniqueUsers: number;
  mainnet: {
    transactions: number;
    contracts: number;
    tvl: string;
    uniqueUsers: number;
  };
  testnet: {
    transactions: number;
    contracts: number;
    tvl: string;
    uniqueUsers: number;
  };
}


export default function ProfileClient({username}: {username: string}) {
  // Define TypeScript interface for API response
  interface GitHubUserData {
    userData: {
      avatar_url: string;
      name: string;
      login: string;
      bio: string;
      location: string;
      created_at: string;
      html_url: string;
      twitter_username: string;
      email: string;
      blog: string;
      followers: number;
      public_repos: number;
    };
    userRepoData: {
      totalForks: number;
      totalStars: number;
      detailedRepos: Array<{
        name: string;
        description: string | null;
        html_url: string;
        stargazers_count: number;
        forks_count: number; 
        languages: Record<string, number>;
      }>;
    };
    organizations?: Array<{
      id: number;
      login: string;
      avatar_url: string;
      description: string;
    }>;
    contributionData?: {
      totalContributions: number;
      totalPRs: number;
      totalIssues: number;
      contributionCalendar: {
        weeks: Array<{
          contributionDays: Array<{
            date: string;
            contributionCount: number;
          }>;
        }>;
      };
      repoContributions?: Record<string, number>;
    };
    onchainHistory?: Record<string, Array<{
      date: string;
      [key: string]: any;
    }>>;
    contractsDeployed?: Record<string, Array<{
      tvl: string;
      uniqueUsers: number;
      [key: string]: any;
    }>>;
    score?: {
      totalScore: number;
      metrics: {
        web2: {
          total: number;
          prs: { score: number; value: number };
          forks: { score: number; value: number };
          stars: { score: number; value: number };
          issues: { score: number; value: number };
          followers: { score: number; value: number };
          accountAge: { score: number; value: number };
          contributions: { score: number; value: number };
          totalLinesOfCode: { score: number; value: number };
        };
        web3: {
          total: number;
          mainnetTVL: { score: number; value: number };
          uniqueUsers: { score: number; value: number };
          transactions: { score: number; value: number };
          web3Languages: { score: number; value: number };
          mainnetContracts: { score: number; value: number };
          testnetContracts: { score: number; value: number };
          cryptoRepoContributions: { score: number; value: number };
        };
      };
    };
    developerWorth?: {
      totalWorth: number;
      breakdown: {
        web2: {
          totalWorth: number;
        };
        web3: {
          totalWorth: number;
          cryptoRepoContributions?: {
            value: number;
            worth: number;
            details: Record<string, number>;
            multiplier: number;
          };
        };
      };
    };
    hackathonData?: {
      WINS: {
        count: number;
        packs: Record<string, boolean>;
      };
      HACKER: {
        count: number;
        packs: Record<string, boolean>;
      };
      totalWins: number;
      totalHacker: number;
    };
  }

  const [userData, setUserData] = useState<GitHubUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedGithubYear, setSelectedGithubYear] = useState<number | null>(null);
  const [selectedOnchainYear, setSelectedOnchainYear] = useState<number | null>(null);
  
  // Get MiniKit hooks for Farcaster integration
  const { context } = useMiniKit();
  const openUrl = useOpenUrl();
  
  // Get current URL for sharing
  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return `https://klyro.io/user/${username}`;
  };
  
  // Copy URL to clipboard
  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(getShareUrl()).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };
  
  // Create share message for Farcaster/Twitter
  const createShareMessage = () => {
    if (!userData) return '';
    
    const githubScore = userData.score?.metrics?.web2?.total || 0;
    const onchainScore = userData.score?.metrics?.web3?.total || 0;
    const overallScore = Math.round((githubScore + onchainScore) / 2);
    const overallWorth = userData.developerWorth?.totalWorth || 0;
    
    return `Looks like my @0xklyro score thinks I'm worth $${formatNumber(overallWorth)} based on my commits 😂\n\nKlyro Score: ${overallScore}/100\nOnchain Score: ${onchainScore}/100\nGitHub Score: ${githubScore}/100\n\n`;
  };
  
  // Share to Farcaster using SDK
  const shareToFarcaster = async () => {
    if (!userData) return;
    
    // Create the message in the required format
    const overallWorth = userData.developerWorth?.totalWorth || 0;
    const shareText = `Looks like my @klyro score thinks I'm worth $${formatNumber(overallWorth)} based on my commits 😂\n\nCheck yours: `;
    const profileUrl = `https://miniapp.klyro.dev/${username}`;
    
    try {
      // If running in Farcaster client context
      if (context?.client) {
        try {
          // Try to use the SDK postMessage method directly
          window.parent.postMessage({
            type: "miniapp:composeCast",
            text: shareText,
            embeds: [profileUrl],
          }, "*");
          
          console.log("Cast compose message sent");
        } catch (sdkError) {
          console.error("Error with composeCast:", sdkError);
        }
        
        // Close dialog after sharing
        setIsShareOpen(false);
      } else {
        // Fallback to normal URL sharing if not in Farcaster client
        window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`, '_blank');
      }
    } catch (error) {
      console.error("Error sharing to Farcaster:", error);
      // Fallback to normal URL share if any method fails
      window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`, '_blank');
    }
  };
  
  // Generate Twitter share URL
  const getTwitterShareUrl = () => {
    if (!userData) return '';
    const shareText = createShareMessage();
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getShareUrl())}`;
  };
  
  // Fetch user data from API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/fbi/status/${username}`);
        
        if (!response.data?.data?.userData) {
          throw new Error("API response missing expected data structure");
        }
        
        setUserData(response.data.data);
        setError("");
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError(err instanceof Error ? err.message : "Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserData();
    }
  }, [username]);

  // Transform GitHub activity data for the heatmap
  const getGithubActivityData = (selectedYear: number | null = null) => {
    if (!userData?.contributionData?.contributionCalendar) {
      return { 
        contributionsByDay: [],
        contributionMonths: [] as string[],
        totalContributions: 0,
        availableYears: []
      };
    }

    const calendar = userData.contributionData.contributionCalendar;
    
    // Extract all dates from the contribution data
    const allDates = calendar.weeks.flatMap(week => 
      week.contributionDays.map(day => new Date(day.date))
    );
    
    // Get all years with activity
    const years = [...new Set(allDates.map(date => date.getFullYear()))].sort();
    
    // If no year is selected, use the most recent
    const yearToUse = selectedYear || (years.length > 0 ? years[years.length - 1] : new Date().getFullYear());
    
    // Filter contribution days for the selected year
    const yearContributions = calendar.weeks.flatMap(week => 
      week.contributionDays.filter(day => {
        const date = new Date(day.date);
        return date.getFullYear() === yearToUse;
      })
    );
    
    if (yearContributions.length === 0) {
      return {
        contributionsByDay: [],
        contributionMonths: [] as string[],
        totalContributions: 0,
        availableYears: years
      };
    }
    
    // Create start and end dates for the full year
    const startDate = new Date(yearToUse, 0, 1);
    const endDate = new Date(yearToUse, 11, 31);
    
    // Generate daily counts (including zeros for days with no activity)
    const dailyCounts = [];
    const months = new Set<string>();
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Find contribution for this date
      const contribution = yearContributions.find(day => day.date.split('T')[0] === dateStr);
      const count = contribution ? contribution.contributionCount : 0;
      
      dailyCounts.push(count);
      
      // Track month names
      const monthName = currentDate.toLocaleString('default', { month: 'short' });
      months.add(monthName);
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Use total contributions from userData instead of just the selected year
    const totalContributions = userData.contributionData.totalContributions;
    
    return {
      contributionsByDay: dailyCounts,
      contributionMonths: Array.from(months),
      totalContributions: totalContributions, // Always use total from all years
      selectedYearContributions: yearContributions.reduce((sum, day) => sum + day.contributionCount, 0), // Year-specific count
      availableYears: years
    };
  };

  // Get top repositories sorted by stars
  const getTopRepos = () => {
    if (!userData?.userRepoData?.detailedRepos) return [];
    
    return userData.userRepoData.detailedRepos
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map(repo => ({
        name: repo.name,
        description: repo.description || "No description",
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        url: repo.html_url,
        languages: repo.languages || {}
      }));
  };

  // Get user's top languages across all repos
  const getTopLanguages = () => {
    if (!userData?.userRepoData?.detailedRepos) return [];
    
    const languageTotals: Record<string, number> = {};
    
    // Aggregate all languages across repos
    userData.userRepoData.detailedRepos.forEach(repo => {
      Object.entries(repo.languages || {}).forEach(([lang, bytes]) => {
        languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
      });
    });
    
    // Convert to array and sort
    return Object.entries(languageTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage: 0 // Will calculate below
      }));
  };

  // Update processOnchainData to explicitly return ChainData[]
  const processOnchainData = () => {
    if (!userData?.onchainHistory || Object.keys(userData.onchainHistory).length === 0) {
      return {
        totalTransactions: 0,
        chains: [] as ChainData[],
        chainCount: 0,
        topChain: '',
        uniqueUsers: 0
      };
    }
    
    const transactions: any[] = [];
    const chainGroups: Record<string, {
      name: string;
      mainnet: {
        transactions: number;
        contracts: number;
        tvl: string;
        uniqueUsers: number;
      };
      testnet: {
        transactions: number;
        contracts: number;
        tvl: string;
        uniqueUsers: number;
      };
      score: number;
      firstActivity: string | null;
    }> = {};
    
    // Get all chain names
    const chainNames = Object.keys(userData.onchainHistory || {});
    
    // Process transactions from each chain
    chainNames.forEach(chainName => {
      const txs = userData.onchainHistory?.[chainName] || [];
      if (!Array.isArray(txs) || txs.length === 0) return;
      
      // Add transactions
      transactions.push(...txs);
      
      // Extract chain info from name
      const isMainnet = chainName.includes('mainnet');
      const networkName = chainName.startsWith('eth') ? 'Ethereum' : 'Base';
      
      // Create chain data
      const txCount = txs.length;
      const contractsData = userData.contractsDeployed?.[chainName] || [];
      const contractCount = contractsData.length;
      
      // Get first activity date
      const dates = txs.map(tx => new Date(tx.date)).sort((a, b) => a.getTime() - b.getTime());
      const firstActivity = dates.length > 0 ? dates[0].toISOString() : null;
      
      // Calculate TVL
      let tvl = 0;
      if (contractsData.length > 0) {
        tvl = contractsData.reduce((sum, contract) => sum + (parseFloat(contract.tvl || "0")), 0);
      }
      
      // Calculate unique users directly from contract data
      let uniqueUsers = 0;
      if (contractsData.length > 0) {
        uniqueUsers = contractsData.reduce((sum, contract) => {
          // Make sure we're handling undefined/null values properly
          const userCount = contract.uniqueUsers !== undefined && contract.uniqueUsers !== null 
            ? Number(contract.uniqueUsers) 
            : 0;
          return sum + userCount;
        }, 0);
      }
      
      // If network already exists, update values
      if (chainGroups[networkName]) {
        if (isMainnet) {
          chainGroups[networkName].mainnet.transactions += txCount;
          chainGroups[networkName].mainnet.contracts += contractCount;
          chainGroups[networkName].mainnet.uniqueUsers += uniqueUsers;
          chainGroups[networkName].mainnet.tvl = (parseFloat(chainGroups[networkName].mainnet.tvl) + tvl).toFixed(2);
        } else {
          chainGroups[networkName].testnet.transactions += txCount;
          chainGroups[networkName].testnet.contracts += contractCount;
          chainGroups[networkName].testnet.uniqueUsers += uniqueUsers;
          chainGroups[networkName].testnet.tvl = (parseFloat(chainGroups[networkName].testnet.tvl) + tvl).toFixed(2);
        }
        
        // Update first activity if this one is earlier
        if (firstActivity && (!chainGroups[networkName].firstActivity || 
            new Date(firstActivity) < new Date(chainGroups[networkName].firstActivity!))) {
          chainGroups[networkName].firstActivity = firstActivity;
        }
        
        // Recalculate score based on total transactions
        const totalTransactions = chainGroups[networkName].mainnet.transactions + chainGroups[networkName].testnet.transactions;
        chainGroups[networkName].score = Math.min(Math.round(totalTransactions * 2), 100);
      } else {
        // Create new network entry with separate mainnet and testnet data
        chainGroups[networkName] = {
          name: networkName,
          mainnet: {
            transactions: isMainnet ? txCount : 0,
            contracts: isMainnet ? contractCount : 0,
            tvl: isMainnet ? tvl.toFixed(2) : "0.00",
            uniqueUsers: isMainnet ? uniqueUsers : 0
          },
          testnet: {
            transactions: isMainnet ? 0 : txCount,
            contracts: isMainnet ? 0 : contractCount,
            tvl: isMainnet ? "0.00" : tvl.toFixed(2),
            uniqueUsers: isMainnet ? 0 : uniqueUsers
          },
          score: Math.min(Math.round(txCount * 2), 100),
          firstActivity
        };
      }
    });
    
    // Convert to ChainData format for compatibility
    const chains = Object.entries(chainGroups).map(([_, data]) => ({
      name: data.name,
      transactions: data.mainnet.transactions + data.testnet.transactions,
      contracts: data.mainnet.contracts + data.testnet.contracts,
      score: data.score,
      firstActivity: data.firstActivity,
      tvl: (parseFloat(data.mainnet.tvl) + parseFloat(data.testnet.tvl)).toFixed(2),
      uniqueUsers: data.mainnet.uniqueUsers + data.testnet.uniqueUsers,
      mainnet: data.mainnet,
      testnet: data.testnet
    })) as ChainData[];
    
    // Calculate total unique users directly from contractsDeployed
    // This ensures we handle empty arrays correctly
    let totalUniqueUsers = 0;
    if (userData.contractsDeployed) {
      Object.values(userData.contractsDeployed).forEach(contracts => {
        if (Array.isArray(contracts)) {
          contracts.forEach(contract => {
            if (contract.uniqueUsers !== undefined && contract.uniqueUsers !== null) {
              totalUniqueUsers += Number(contract.uniqueUsers);
            }
          });
        }
      });
    }
    
    // Find top chain by transaction count
    const topChain = chains.length > 0 
      ? chains.reduce((max, chain) => chain.transactions > max.transactions ? chain : max, chains[0]).name
      : '';
    
    return {
      totalTransactions: transactions.length,
      chains,
      chainCount: chains.length,
      topChain,
      uniqueUsers: totalUniqueUsers
    };
  };

  // Process onchain data for heatmap with year selection
  const getOnchainActivityData = (selectedYear: number | null = null) => {
    if (!userData?.onchainHistory || Object.keys(userData.onchainHistory).length === 0) {
      return {
        transactionsByDay: [],
        activityMonths: [] as string[],
        totalTransactions: 0,
        availableYears: []
      };
    }

    // Collect all transactions from all chains
    const allTransactions = Object.values(userData.onchainHistory).flat();
    
    // Get all years with activity
    const years = [...new Set(allTransactions.map(tx => new Date(tx.date).getFullYear()))].sort();
    
    // If no year is selected, use the most recent
    const yearToUse = selectedYear || (years.length > 0 ? years[years.length - 1] : new Date().getFullYear());
    
    // Filter transactions for the selected year
    const yearTransactions = allTransactions.filter(tx => new Date(tx.date).getFullYear() === yearToUse);
    
    if (yearTransactions.length === 0) {
      return {
        transactionsByDay: [],
        activityMonths: [] as string[],
        totalTransactions: 0,
        availableYears: years
      };
    }
    
    // Create start and end dates for the full year
    const startDate = new Date(yearToUse, 0, 1);
    const endDate = new Date(yearToUse, 11, 31);
    
    // Generate daily counts (including zeros for days with no activity)
    const dailyCounts = [];
    const months = new Set<string>();
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Count transactions on this date
      const count = yearTransactions.filter(tx => 
        tx.date.split('T')[0] === dateStr
      ).length;
      
      dailyCounts.push(count);
      
      // Track month names
      const monthName = currentDate.toLocaleString('default', { month: 'short' });
      months.add(monthName);
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      transactionsByDay: dailyCounts,
      activityMonths: Array.from(months),
      totalTransactions: yearTransactions.length,
      availableYears: years
    };
  };

  // Calculate scores
  const calculateScores = () => {
    if (!userData) return { github: 0, onchain: 0, web2: 0, overall: 0 };
    
    const onchainScore = userData.score?.metrics?.web3?.total 
      ? Math.round(userData.score.metrics.web3.total) 
      : 0;
    
    // Default a baseline web2 score if not available
    const web2Score = userData.score?.metrics?.web2?.total 
      ? Math.round(userData.score.metrics.web2.total) 
      : 70;
    
    // Calculate overall score
    const overall = Math.round((web2Score + onchainScore) / 2);
    
    return {
      onchain: onchainScore,
      web2: web2Score,
      overall
    };
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4">Loading profile data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !userData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center p-6 bg-zinc-900 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">Error Loading Profile</h2>
          <p className="text-zinc-400 mb-6">{error || "User data not available"}</p>
          <Link href="/user">
            <Button variant="outline">Back to Users</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get transformed data
  const githubActivity = getGithubActivityData(selectedGithubYear);
  const onchainActivity = getOnchainActivityData(selectedOnchainYear);
  const topRepos = getTopRepos();
  const topLanguages = getTopLanguages();
  const scores = calculateScores();
  const onchainData = processOnchainData();

  // Calculate total bytes for languages to get percentages
  const totalLanguageBytes = topLanguages.reduce((sum, lang) => sum + lang.bytes, 0);
  topLanguages.forEach(lang => {
    lang.percentage = Math.round((lang.bytes / totalLanguageBytes) * 100);
  });

  // Create user object from API data
  const user = {
    name: userData.userData.name || userData.userData.login,
    username: userData.userData.login,
    avatar: userData.userData.avatar_url,
    bio: userData.userData.bio || "",
    location: userData.userData.location || "Unknown",
    joinedDate: formatDate(userData.userData.created_at),
    twitter: userData.userData.twitter_username,
    email: userData.userData.email,
    blogUrl: userData.userData.blog,
    verified: true,
    githubUrl: userData.userData.html_url,
    skills: topLanguages.map(lang => lang.name),
    scores,
    worth: {
      total: userData.developerWorth?.totalWorth || 0,
      web2: userData.developerWorth?.breakdown?.web2?.totalWorth || 0,
      web3: userData.developerWorth?.breakdown?.web3?.totalWorth || 0
    },
    chains: onchainData.chains as ChainData[],
    githubActivity: {
      contributionsByDay: githubActivity.contributionsByDay,
      contributionMonths: githubActivity.contributionMonths as string[],
      totalContributions: githubActivity.totalContributions,
      selectedYearContributions: githubActivity.selectedYearContributions || 0,
      topRepos,
      followers: userData.userData.followers,
      repos: userData.userData.public_repos,
      stars: userData.userRepoData.totalStars || 0,
      forks: userData.userRepoData.totalForks || 0,
      contributions: githubActivity.totalContributions,
      prs: userData.contributionData?.totalPRs || 0,
      issues: userData.contributionData?.totalIssues || 0
    },
    onchainActivity: {
      totalTransactions: onchainData.totalTransactions,
      chains: onchainData.chains as ChainData[],
      chainCount: onchainData.chainCount,
      topChain: onchainData.topChain,
      uniqueUsers: onchainData.uniqueUsers,
      transactionsByDay: onchainActivity.transactionsByDay,
      activityMonths: onchainActivity.activityMonths as string[]
    }
  };

  return (
    <main className="bg-black min-h-screen text-white">
      <div className="pt-4 sm:pt-8 pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          {/* Profile Card - Mobile Optimized */}
          <div className="bg-zinc-950/90 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-4 sm:p-6 mb-6 shadow-lg">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
              {/* Profile Image and Badge Section */}
              <div className="relative flex-shrink-0">
                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full overflow-hidden border-4 border-black">
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-base sm:text-lg font-semibold rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border-4 border-black">
                  {user.scores.overall}
                </div>
              </div>
              
              {/* User Info Section */}
              <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 w-full">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center">
                      {user.name}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <Badge className="bg-zinc-800 text-zinc-200">@{user.username}</Badge>
                    </div>
                  </div>
                  
                  {/* Social Media Icons */}
                  <div className="flex items-center justify-center md:justify-end gap-2 mt-2 sm:mt-0">
                    <Link href={`https://github.com/${user.username}`} target="_blank">
                      <Button variant="outline" size="icon" className="bg-zinc-900 border-zinc-700 h-9 w-9 rounded-full">
                        <Github className="h-4 w-4" />
                      </Button>
                    </Link>
                    {user.twitter && (
                      <Link href={`https://twitter.com/${user.twitter}`} target="_blank">
                        <Button variant="outline" size="icon" className="bg-zinc-900 border-zinc-700 h-9 w-9 rounded-full">
                          <svg width="16" height="14" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.99 0H20.298L13.071 8.26004L21.573 19.5H14.916L9.70202 12.683L3.73597 19.5H0.426L8.15602 10.665L0 0H6.82602L11.539 6.23104L16.99 0ZM15.829 17.52H17.662L5.83002 1.876H3.86297L15.829 17.52Z" fill="#ffffff"></path>
                          </svg>
                        </Button>
                      </Link>
                    )}
                    {user.blogUrl && (
                      <Link href={user.blogUrl} target="_blank">
                        <Button variant="outline" size="icon" className="bg-zinc-900 border-zinc-700 h-9 w-9 rounded-full">
                          <Globe className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                
                {/* Skills/Languages */}
                <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                  {user.skills.slice(0, 4).map(skill => (
                    <Badge key={skill} className="bg-zinc-800 text-zinc-200">
                      {skill}
                    </Badge>
                  ))}
                  {user.skills.length > 4 && (
                    <Badge className="bg-zinc-800 text-zinc-200">
                      +{user.skills.length - 4}
                    </Badge>
                  )}
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-2">
                  {/* GitHub Stats */}
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Github className="h-4 w-4 text-zinc-400" />
                      <h3 className="text-sm font-medium text-zinc-400">GitHub Score</h3>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xl font-bold">{user.scores.web2}</span>
                      <span className="text-xs text-zinc-500 mt-1">/100</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {formatNumber(user.githubActivity.stars)} stars · {formatNumber(user.githubActivity.contributions)} commits
                    </div>
                  </div>
                  
                  {/* Onchain Stats */}
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-400">
                        <path d="M2 2L8 8M16 16L22 22M22 2L16 8M8 16L2 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <h3 className="text-sm font-medium text-zinc-400">Onchain Score</h3>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xl font-bold">{user.scores.onchain}</span>
                      <span className="text-xs text-zinc-500 mt-1">/100</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {formatNumber(user.onchainActivity.totalTransactions)} txns · {user.onchainActivity.chainCount} chains
                    </div>
                  </div>
                  
                  {/* Worth Stats */}
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-zinc-400 text-sm">$</span>
                      <h3 className="text-sm font-medium text-zinc-400">Dev Worth</h3>
                    </div>
                    <div className="text-xl font-bold">${formatNumber(user.worth.total)}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Based on contributions & deployed contracts
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Share Button */}
            <div className="flex justify-center mt-4 gap-2">
            <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <User className="h-4 w-4 mr-2" />
                    <Link href={`https://www.klyro.dev/${user.username}`} target="_blank">Visit Full Profile</Link>
                  </Button>
              <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-zinc-950 border border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold mb-2">Share this profile</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      Share {user.name}&apos;s developer profile with your network
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col space-y-4 mt-4">
                    <button 
                      className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium"
                      onClick={shareToFarcaster}
                    >
                      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.28994 0H20.4142V25H18.0473V13.5484H18.0241C17.7625 10.3834 15.323 7.90323 12.3521 7.90323C9.38119 7.90323 6.94161 10.3834 6.68002 13.5484H6.65681V25H4.28994V0Z" fill="white"/>
                        <path d="M0 3.54839L0.961538 7.09677H1.77515V21.4516C1.36665 21.4516 1.0355 21.8127 1.0355 22.2581V23.2258H0.887574C0.479079 23.2258 0.147929 23.5869 0.147929 24.0323V25H8.43195V24.0323C8.43195 23.5869 8.1008 23.2258 7.69231 23.2258H7.54438V22.2581C7.54438 21.8127 7.21323 21.4516 6.80473 21.4516H5.91716V3.54839H0Z" fill="white"/>
                        <path d="M18.1953 21.4516C17.7868 21.4516 17.4556 21.8127 17.4556 22.2581V23.2258H17.3077C16.8992 23.2258 16.568 23.5869 16.568 24.0323V25H24.8521V24.0323C24.8521 23.5869 24.5209 23.2258 24.1124 23.2258H23.9645V22.2581C23.9645 21.8127 23.6333 21.4516 23.2249 21.4516V7.09677H24.0385L25 3.54839H19.0828V21.4516H18.1953Z" fill="white"/>
                      </svg>
                      Share on Warpcast
                    </button>
                    <a 
                      href={getTwitterShareUrl()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-[#1DA1F2] hover:bg-[#1a94e1] text-white py-2 px-4 rounded-lg font-medium"
                    >
                      <svg className="size-6" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.3 5.2H19.8L13.8 12L21 21H15.4L11 15.5L6 21H3.5L9.9 13.7L3 5.2H8.7L12.7 10.2L17.3 5.2ZM16 19.3H17.3L8.1 6.8H6.7L16 19.3Z" fill="white"/>
                      </svg>
                      Share on X
                    </a>
                    <button 
                      className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-lg font-medium"
                      onClick={copyToClipboard}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-5 w-5 text-green-400" />
                          <span className="text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
