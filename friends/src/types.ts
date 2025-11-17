export interface Data {
    currentUser: {};
    friends: { displayName: string; id: string }[];
    mutuals: Record<string, string[]>;
}
