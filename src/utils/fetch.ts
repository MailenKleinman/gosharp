export const get = async (url: string, headers: any) => {
    switch (url) {
        case '/api/forms':
            return Promise.resolve({ data: JSON.parse(localStorage.getItem('forms') || '[]') });
        case '/api/workflows':
            return Promise.resolve({ data: JSON.parse(localStorage.getItem('workflows') || '[]') });
        case '/api/executions':
            return Promise.resolve({ data: JSON.parse(localStorage.getItem('executions') || '[]') });
        default:
            return Promise.resolve({ data: null });
    }
};

export const post = async (url: string, headers: object, payload: object) => {
    const push = (key: string, item: any) => {
        const id = crypto.randomUUID();
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        items.push({id, ...item});
        localStorage.setItem(key, JSON.stringify(items));
        return id;
    };

    switch (url) {
        case '/api/forms':
            return Promise.resolve(push('forms', payload));
        case '/api/workflows':
            return Promise.resolve(push('workflows', payload));
        case '/api/executions':
            return Promise.resolve(push('executions', payload));
        default:
            return Promise.resolve({ data: null });
    }
};

export const patch = (url: string, headers: any, payload: object) => {

};

export const put = (url: string, headers: any, payload: object) => {

};

export const del = (url: string, headers: any) => {

};


