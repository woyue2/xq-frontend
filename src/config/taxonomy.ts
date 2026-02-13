export interface TopicConfig {
    label: string;
    value: string;
}

export interface SubjectConfig {
    label: string;
    value: string;
    topics: string[];
    methods: string[];
}

export const TAXONOMY: Record<string, SubjectConfig> = {
    math: {
        label: "数学",
        value: "math",
        topics: [
            "二次函数",
            "一元二次方程",
            "勾股定理",
            "圆的性质",
            "概率与统计",
            "三角函数",
            "平行四边形",
        ],
        methods: [
            "配方法",
            "公式法",
            "因式分解法",
            "待定系数法",
            "数形结合",
            "反证法",
            "换元法",
            "暂不确定",
        ],
    },
};

export const SUBJECT_OPTIONS = Object.values(TAXONOMY).map(s => ({
    label: s.label,
    value: s.value,
}));
