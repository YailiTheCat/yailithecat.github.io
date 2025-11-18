export interface Data {
    currentUser: { friends: string[] };
    friends: Friend[];
    mutuals: Record<string, string[]>;
}

export interface Friend {
    displayName: string;
    id: string;
    imageUrl: string;
    statusDescription: string;
    bio: string;
    currentAvatarImageUrl: string;
}
