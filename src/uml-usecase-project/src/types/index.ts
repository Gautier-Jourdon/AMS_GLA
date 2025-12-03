export type UseCase = {
    id: string;
    name: string;
    description: string;
    actors: string[];
};

export interface Actor {
    id: string;
    name: string;
    role: string;
}