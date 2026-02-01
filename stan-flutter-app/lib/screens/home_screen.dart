import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/briefing_service.dart';
import '../widgets/briefing_card.dart';
import 'briefing_screen.dart';
import 'artists_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadFeed();
    });
  }

  Future<void> _loadFeed() async {
    final auth = context.read<AuthService>();
    final userId = auth.currentUser?.id;
    await context.read<BriefingService>().loadFeed(userId);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final isLoggedIn = auth.currentUser != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('STAN'),
        actions: [
          IconButton(
            icon: const Icon(Icons.explore),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ArtistsScreen()),
              );
            },
            tooltip: 'Browse Artists',
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
      body: Consumer<BriefingService>(
        builder: (context, service, child) {
          if (service.isLoading) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading briefings...'),
                ],
              ),
            );
          }

          if (service.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text('Error: ${service.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadFeed,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (service.briefings.isEmpty) {
            return _buildEmptyState();
          }

          return RefreshIndicator(
            onRefresh: _loadFeed,
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
                        builder: (context) => BriefingScreen(briefing: briefing),
                      ),
                    );
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.newspaper, size: 80, color: Colors.grey),
            const SizedBox(height: 24),
            const Text(
              'No briefings yet',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Briefings are generated daily.\nBrowse artists to follow!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ArtistsScreen()),
                );
              },
              icon: const Icon(Icons.explore),
              label: const Text('Browse Artists'),
            ),
          ],
        ),
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
                leading: const CircleAvatar(child: Icon(Icons.person)),
                title: Text(user?.email ?? 'User'),
                subtitle: const Text('Signed in'),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Sign Out'),
                onTap: () async {
                  Navigator.pop(context);
                  await auth.signOut();
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
