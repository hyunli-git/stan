import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/briefing_service.dart';
import '../widgets/briefing_card.dart';
import 'briefing_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isGenerating = false;

  // Popular stans for guests
  final List<Map<String, String>> _popularStans = [
    {'name': 'BTS', 'category': 'K-Pop'},
    {'name': 'Taylor Swift', 'category': 'Music'},
    {'name': 'BLACKPINK', 'category': 'K-Pop'},
    {'name': 'Stray Kids', 'category': 'K-Pop'},
    {'name': 'NewJeans', 'category': 'K-Pop'},
    {'name': 'aespa', 'category': 'K-Pop'},
    {'name': 'Olivia Rodrigo', 'category': 'Music'},
    {'name': 'Marvel', 'category': 'Entertainment'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadContent();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadContent() async {
    final auth = context.read<AuthService>();
    final userId = auth.currentUser?.id;

    // Only load user's briefings if logged in
    if (userId != null) {
      await context.read<BriefingService>().loadTodaysBriefings(userId);
    }
  }

  Future<void> _handleRefresh() async {
    await _loadContent();
  }

  Future<void> _generateBriefing(String stanName) async {
    if (stanName.trim().isEmpty) return;

    setState(() => _isGenerating = true);

    try {
      final auth = context.read<AuthService>();
      final briefing = await context.read<BriefingService>().generateBriefing(
            stanName,
            auth.currentUser?.id,
          );

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => BriefingScreen(briefing: briefing),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGenerating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final isLoggedIn = auth.currentUser != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('STAN'),
        actions: [
          if (isLoggedIn)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _handleRefresh,
              tooltip: 'Refresh',
            ),
          IconButton(
            icon: Icon(isLoggedIn ? Icons.person : Icons.login),
            onPressed: () {
              if (isLoggedIn) {
                _showProfileMenu(context);
              } else {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              }
            },
            tooltip: isLoggedIn ? 'Profile' : 'Sign In',
          ),
        ],
      ),
      body: _isGenerating
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Generating briefing...'),
                ],
              ),
            )
          : Consumer<BriefingService>(
              builder: (context, service, child) {
                // If logged in and has briefings, show them
                if (isLoggedIn && service.briefings.isNotEmpty) {
                  return RefreshIndicator(
                    onRefresh: _handleRefresh,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: service.briefings.length,
                      itemBuilder: (context, index) {
                        final briefing = service.briefings[index];
                        return BriefingCard(
                          briefing: briefing,
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    BriefingScreen(briefing: briefing),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  );
                }

                // Guest view or empty briefings: show popular stans
                return _buildGuestView();
              },
            ),
    );
  }

  Widget _buildGuestView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search/Input section
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Enter any topic (e.g., BTS, Taylor Swift)',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                icon: const Icon(Icons.arrow_forward),
                onPressed: () => _generateBriefing(_searchController.text),
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
            ),
            onSubmitted: _generateBriefing,
          ),
          const SizedBox(height: 24),

          // Welcome message
          const Text(
            'Get AI-powered briefings',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Stay updated on your favorite artists, shows, and fandoms',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),

          // Popular stans
          const Text(
            'Popular Topics',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _popularStans.map((stan) {
              return ActionChip(
                avatar: const Icon(Icons.star, size: 18),
                label: Text(stan['name']!),
                onPressed: () => _generateBriefing(stan['name']!),
              );
            }).toList(),
          ),
          const SizedBox(height: 32),

          // How it works
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'How it works',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                _buildStep('1', 'Enter a topic or select from popular ones'),
                _buildStep('2', 'AI gathers the latest news and updates'),
                _buildStep('3', 'Get a personalized briefing in seconds'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep(String number, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          CircleAvatar(
            radius: 12,
            child: Text(number, style: const TextStyle(fontSize: 12)),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }

  void _showProfileMenu(BuildContext context) {
    final auth = context.read<AuthService>();
    final user = auth.currentUser;

    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.person),
                title: Text(user?.email ?? 'User'),
                subtitle: const Text('Your account'),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.settings),
                title: const Text('Settings'),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Settings coming soon!'),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Sign Out'),
                onTap: () {
                  Navigator.pop(context);
                  auth.signOut();
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
