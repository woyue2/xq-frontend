GET是拿数据 POST是改数据
只看 GET 请求（两种常用方法）
方法 A：用过滤框只显示 GET（最快）

在 Network 面板顶部，有一个过滤输入框（Filter 输入框，通常在 “Filter” 文字旁边）。
输入：method:GET 然后回车（或直接等待自动过滤）。
这样列表里只会留下 GET 请求，POST/PUT/DELETE 等都会被过滤掉。
telerik.com/blogs/how-to-use-the-devtools-network-filter-effectively
方法 B：右键列头 → Method → 筛选

在请求列表的列头（Name / Status / Type / Size 那一行）上点击右键。
勾选 “Method”（如果没有勾选）。
现在 Method 列会显示 GET / POST 等。
部分版本支持直接点列头筛选；如果不支持，就用上面的 Filter 输入 method:GET。
telerik.com/blogs/how-to-use-the-devtools-network-filter-effectively
