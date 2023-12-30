export interface CallMessageOptions {
    id: number;
    name: string;
    args: Array<unknown>;
}

export class CallMessage {
    public type: string;
    public id: number;
    public name: string;
    public args: Array<unknown>;

    constructor({ id, name, args }: CallMessageOptions) {
        this.type = 'CallMessage';
        this.id = id;
        this.name = name;
        this.args = args;
    }
}

export interface ResultMessageOptions {
    id: number;
    value?: unknown;
    error?: { [key: string]: unknown };
}

export class ResultMessage {
    public type: string;
    public id: number;
    public value?: unknown;
    public error?: { [key: string]: unknown };

    constructor({ id, value, error }: ResultMessageOptions) {
        this.type = 'ResultMessage';
        this.id = id;
        this.value = value;
        this.error = error;
    }
}