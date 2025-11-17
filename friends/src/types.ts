export interface Data {
    currentUser: {};
    friends: { displayName: string; id: string; imageUrl: string }[];
    mutuals: Record<string, string[]>;
}
