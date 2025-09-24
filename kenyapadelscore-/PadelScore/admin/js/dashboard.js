// API Configuration
const API_BASE = `${window.location.origin}/api`;

// Initialize Socket.IO for real-time updates
let socket;

// Dashboard Controller
class DashboardController {
    constructor() {
        this.init();
        this.connectSocket();
    }

    async init() {
        await this.loadDashboardStats();
        await this.loadLiveMatches();
        await this.loadRecentTournaments();
        this.setupEventListeners();
    }

    connectSocket() {
        socket = io(`${window.location.origin}`);
        
        socket.on('connect', () => {
            console.log('Connected to server for real-time updates');
        });

        socket.on('dashboard-update', (data) => {
            if (data.stats) {
                this.updateDashboardStatsUI(data.stats);
            }
        });

        socket.on('match-update', (matchData) => {
            // Refresh live matches when any match updates
            this.loadLiveMatches();
        });
    }

    async loadDashboardStats() {
        try {
            const [tournaments, matches, players] = await Promise.all([
                fetch(`${API_BASE}/tournaments`).then(r => r.json()),
                fetch(`${API_BASE}/matches`).then(r => r.json()),
                fetch(`${API_BASE}/players`).then(r => r.json())
            ]);

            const activeTournaments = tournaments.tournaments.filter(t => t.status === 'active').length;
            const ongoingMatches = matches.matches ? matches.matches.filter(m => m.status === 'in_progress').length : 0;
            const totalPlayers = players.total || 0;

            this.updateDashboardStatsUI({
                activeTournaments,
                ongoingMatches,
                totalPlayers,
                rankingUpdates: 0 // Placeholder for now
            });
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            // Show fallback data
            this.updateDashboardStatsUI({
                activeTournaments: 0,
                ongoingMatches: 0,
                totalPlayers: 0,
                rankingUpdates: 0
            });
        }
    }

    updateDashboardStatsUI(stats) {
        const statsCards = document.querySelectorAll('.stats-card');
        if (statsCards[0]) statsCards[0].querySelector('.stat-value').textContent = stats.activeTournaments;
        if (statsCards[1]) statsCards[1].querySelector('.stat-value').textContent = stats.ongoingMatches;
        if (statsCards[2]) statsCards[2].querySelector('.stat-value').textContent = stats.totalPlayers;
        if (statsCards[3]) statsCards[3].querySelector('.stat-value').textContent = stats.rankingUpdates;
    }

    async loadLiveMatches() {
        try {
            const response = await fetch(`${API_BASE}/matches`);
            const data = await response.json();
            const liveMatches = data.matches ? data.matches.filter(m => m.status === 'in_progress') : [];
            
            this.updateLiveMatchesUI(liveMatches);
        } catch (error) {
            console.error('Error loading live matches:', error);
            this.updateLiveMatchesUI([]);
        }
    }

    updateLiveMatchesUI(matches) {
        const tbody = document.querySelector('#live-matches-tbody');
        if (!tbody) return;

        if (matches.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-slate-500 dark:text-slate-400">
                        No live matches currently
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = matches.map(match => `
            <tr class="border-b border-slate-200 dark:border-slate-700">
                <td class="px-4 py-3">${match.tournament_name || 'N/A'}</td>
                <td class="px-4 py-3">${match.team1_name || 'Team 1'}</td>
                <td class="px-4 py-3">${match.team2_name || 'Team 2'}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Live
                    </span>
                </td>
                <td class="px-4 py-3">${match.court_number || 'N/A'}</td>
                <td class="px-4 py-3">
                    <button class="text-primary hover:text-primary/80 font-medium text-sm" onclick="viewMatch(${match.id})">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadRecentTournaments() {
        try {
            const response = await fetch(`${API_BASE}/tournaments`);
            const data = await response.json();
            const recentTournaments = data.tournaments.slice(0, 5); // Show last 5
            
            this.updateRecentTournamentsUI(recentTournaments);
        } catch (error) {
            console.error('Error loading recent tournaments:', error);
            this.updateRecentTournamentsUI([]);
        }
    }

    updateRecentTournamentsUI(tournaments) {
        const container = document.querySelector('#recent-tournaments');
        if (!container) return;

        if (tournaments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-500 dark:text-slate-400">
                    No tournaments yet
                </div>
            `;
            return;
        }

        container.innerHTML = tournaments.map(tournament => `
            <div class="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg">
                <div>
                    <h4 class="font-medium text-slate-900 dark:text-white">${tournament.name}</h4>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${new Date(tournament.start_date).toLocaleDateString()}</p>
                </div>
                <span class="px-2 py-1 text-xs font-medium rounded-full ${
                    tournament.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    tournament.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }">
                    ${tournament.status}
                </span>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadDashboardStats();
            this.loadLiveMatches();
        }, 30000);
    }

}

// Global functions
window.viewMatch = (matchId) => {
    // Navigate to match detail view
    window.location.href = `/admin/match-details.html?id=${matchId}`;
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardController();
});

// Socket.IO library will be loaded from CDN
if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
    script.onload = () => {
        console.log('Socket.IO loaded');
    };
    document.head.appendChild(script);
}