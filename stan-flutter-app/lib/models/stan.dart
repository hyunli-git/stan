class Stan {
  final String? id;
  final String name;
  final String category;
  final String? description;
  final bool isPopular;

  Stan({
    this.id,
    required this.name,
    required this.category,
    this.description,
    this.isPopular = false,
  });

  factory Stan.fromJson(Map<String, dynamic> json) {
    return Stan(
      id: json['id'] as String?,
      name: json['name'] as String,
      category: json['category'] as String? ?? 'general',
      description: json['description'] as String?,
      isPopular: json['is_popular'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'name': name,
      'category': category,
      if (description != null) 'description': description,
      'is_popular': isPopular,
    };
  }

  // Category icons
  String get categoryIcon {
    switch (category.toLowerCase()) {
      case 'kpop':
        return '🎤';
      case 'anime':
        return '🎨';
      case 'sports':
        return '⚽';
      case 'entertainment':
        return '🎬';
      case 'gaming':
        return '🎮';
      default:
        return '⭐';
    }
  }

  // Category colors
  String get categoryColor {
    switch (category.toLowerCase()) {
      case 'kpop':
        return '#FF6B9D';
      case 'anime':
        return '#4ECDC4';
      case 'sports':
        return '#FF6B35';
      case 'entertainment':
        return '#FFE66D';
      case 'gaming':
        return '#A569BD';
      default:
        return '#7C3AED';
    }
  }
}
