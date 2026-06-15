<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">

  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>站点地图 - Jackknifer</title>
        <style>
          :root {
            color-scheme: light dark;
            --page: #f5f2ec;
            --panel: #fffaf2;
            --text: #26231f;
            --muted: #706a60;
            --line: #ded6ca;
            --accent: #2f6f73;
            --accent-soft: #e5f0ee;
          }

          @media (prefers-color-scheme: dark) {
            :root {
              --page: #171817;
              --panel: #20211f;
              --text: #ebe6dc;
              --muted: #aaa298;
              --line: #343630;
              --accent: #8ec6bf;
              --accent-soft: #273635;
            }
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: var(--page);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.6;
          }

          main {
            width: min(1080px, calc(100% - 32px));
            margin: 48px auto;
          }

          .header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 22px;
          }

          h1 {
            margin: 0 0 6px;
            font-size: clamp(1.8rem, 4vw, 3rem);
            font-weight: 700;
            letter-spacing: 0;
          }

          p {
            margin: 0;
            color: var(--muted);
          }

          a {
            color: var(--accent);
            text-decoration: none;
          }

          a:hover {
            text-decoration: underline;
          }

          .count {
            flex: 0 0 auto;
            border: 1px solid var(--line);
            border-radius: 999px;
            background: var(--accent-soft);
            color: var(--accent);
            padding: 8px 14px;
            font-size: 0.95rem;
            font-weight: 650;
          }

          .table-wrap {
            overflow-x: auto;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: var(--panel);
            box-shadow: 0 18px 48px rgba(0, 0, 0, 0.08);
          }

          table {
            width: 100%;
            border-collapse: collapse;
            min-width: 760px;
          }

          th,
          td {
            padding: 13px 16px;
            border-bottom: 1px solid var(--line);
            text-align: left;
            vertical-align: top;
          }

          th {
            background: rgba(127, 127, 127, 0.08);
            color: var(--muted);
            font-size: 0.82rem;
            font-weight: 700;
          }

          td {
            font-size: 0.94rem;
          }

          tr:last-child td {
            border-bottom: 0;
          }

          .url {
            max-width: 660px;
            overflow-wrap: anywhere;
          }

          .meta {
            white-space: nowrap;
            color: var(--muted);
          }

          @media (max-width: 720px) {
            main {
              width: min(100% - 24px, 1080px);
              margin: 28px auto;
            }

            .header {
              display: block;
            }

            .count {
              display: inline-block;
              margin-top: 14px;
            }
          }
        </style>
      </head>
      <body>
        <main>
          <div class="header">
            <div>
              <h1>站点地图</h1>
              <p>这个文件供搜索引擎读取，也可以在这里查看博客已公开的页面。</p>
            </div>
            <div class="count">
              <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> 个链接
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>URL</th>
                  <th>最后更新</th>
                  <th>更新频率</th>
                  <th>权重</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td class="url">
                      <a>
                        <xsl:attribute name="href">
                          <xsl:value-of select="sitemap:loc"/>
                        </xsl:attribute>
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td class="meta">
                      <xsl:value-of select="sitemap:lastmod"/>
                    </td>
                    <td class="meta">
                      <xsl:value-of select="sitemap:changefreq"/>
                    </td>
                    <td class="meta">
                      <xsl:value-of select="sitemap:priority"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
