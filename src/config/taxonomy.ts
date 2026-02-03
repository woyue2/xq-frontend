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
    physics: {
        label: "物理",
        value: "physics",
        topics: [
            "牛顿第一定律",
            "二力平衡",
            "压强与浮力",
            "欧姆定律",
            "电磁感应",
            "光的折射",
            "机械能守恒",
        ],
        methods: [
            "控制变量法",
            "理想模型法",
            "转换法",
            "等效替代法",
            "暂不确定",
        ],
    },
    chemistry: {
        label: "化学",
        value: "chemistry",
        topics: [
            "氧气的制取",
            "酸碱盐",
            "金属活动性顺序",
            "质量守恒定律",
            "溶液浓度",
        ],
        methods: [
            "对比实验法",
            "归纳法",
            "实验探究法",
            "暂不确定",
        ],
    },
};

export const SUBJECT_OPTIONS = Object.values(TAXONOMY).map(s => ({
    label: s.label,
    value: s.value,
}));
