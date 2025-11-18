export interface Data {
    currentUser: { friends: string[] };
    friends: { displayName: string; id: string; imageUrl: string }[];
    mutuals: Record<string, string[]>;
}
