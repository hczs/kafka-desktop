interface PageContextVal {
    theme: 'light' | 'dark' | 'high-contrast',
    changeTheme: (theme: Theme) => void
}

interface ClusterInfo {
    id: string,
    clusterName: string,
    brokers: string
}

interface brokerInfo {
    nodeId: number;
    host: string;
    port: number
}