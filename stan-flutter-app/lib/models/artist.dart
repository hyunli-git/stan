class Artist {
  final String id;
  final String name;
  final String category;
  final String? imageUrl;
  final bool isFollowed;

  Artist({
    required this.id,
    required this.name,
    required this.category,
    this.imageUrl,
    this.isFollowed = false,
  });

  factory Artist.fromJson(Map<String, dynamic> json) {
    return Artist(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      category: json['category'] ?? 'Music',
      imageUrl: json['image_url'],
      isFollowed: json['is_followed'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'image_url': imageUrl,
      'is_followed': isFollowed,
    };
  }

  Artist copyWith({
    String? id,
    String? name,
    String? category,
    String? imageUrl,
    bool? isFollowed,
  }) {
    return Artist(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      imageUrl: imageUrl ?? this.imageUrl,
      isFollowed: isFollowed ?? this.isFollowed,
    );
  }
}
