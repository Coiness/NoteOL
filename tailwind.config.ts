import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: ({ theme }: { theme: any }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--gh-fg)',
            '--tw-prose-headings': 'var(--gh-fg)',
            '--tw-prose-lead': 'var(--gh-quote-text)',
            '--tw-prose-links': theme('colors.blue.600'),
            '--tw-prose-bold': 'var(--gh-fg)',
            '--tw-prose-counters': 'var(--gh-quote-text)',
            '--tw-prose-bullets': 'var(--gh-quote-text)',
            '--tw-prose-hr': 'var(--gh-border)',
            '--tw-prose-quotes': 'var(--gh-quote-text)',
            '--tw-prose-quote-borders': 'var(--gh-quote-border)',
            '--tw-prose-captions': 'var(--gh-quote-text)',
            '--tw-prose-code': 'var(--gh-fg)',
            '--tw-prose-pre-code': 'var(--gh-fg)',
            '--tw-prose-pre-bg': 'var(--gh-code-bg)',
            '--tw-prose-th-borders': 'var(--gh-border)',
            '--tw-prose-td-borders': 'var(--gh-border)',
            
            // Dark mode (using same dynamic vars)
            '--tw-prose-invert-body': 'var(--gh-fg)',
            '--tw-prose-invert-headings': 'var(--gh-fg)',
            '--tw-prose-invert-lead': 'var(--gh-quote-text)',
            '--tw-prose-invert-links': theme('colors.blue.400'),
            '--tw-prose-invert-bold': 'var(--gh-fg)',
            '--tw-prose-invert-counters': 'var(--gh-quote-text)',
            '--tw-prose-invert-bullets': 'var(--gh-quote-text)',
            '--tw-prose-invert-hr': 'var(--gh-border)',
            '--tw-prose-invert-quotes': 'var(--gh-quote-text)',
            '--tw-prose-invert-quote-borders': 'var(--gh-quote-border)',
            '--tw-prose-invert-captions': 'var(--gh-quote-text)',
            '--tw-prose-invert-code': 'var(--gh-fg)',
            '--tw-prose-invert-pre-code': 'var(--gh-fg)',
            '--tw-prose-invert-pre-bg': 'var(--gh-code-bg)',
            '--tw-prose-invert-th-borders': 'var(--gh-border)',
            '--tw-prose-invert-td-borders': 'var(--gh-border)',
            
            maxWidth: 'none',
            color: 'var(--tw-prose-body)',
            lineHeight: '1.6',
            fontFamily: 'var(--font-sans)',
            
            // 调整段落间距 (GitHub 风格: 0.8em)
            p: {
              marginTop: '0.8em',
              marginBottom: '0.8em',
            },
            
            // 标题样式
            h1: {
              fontWeight: '600',
              fontSize: '2.25em',
              paddingBottom: '0.3em',
              borderBottom: '1px solid var(--tw-prose-hr)',
              marginTop: '1rem',
              marginBottom: '1rem',
              lineHeight: '1.2',
            },
            h2: {
              fontWeight: '600',
              fontSize: '1.75em',
              paddingBottom: '0.3em',
              borderBottom: '1px solid var(--tw-prose-hr)',
              marginTop: '1.5rem', // 保持视觉层级，稍微大一点的顶部间距
              marginBottom: '1rem',
              lineHeight: '1.225',
            },
            h3: {
              fontSize: '1.5em',
              marginTop: '1rem',
              marginBottom: '1rem',
              lineHeight: '1.43',
            },
            h4: {
              fontSize: '1.25em',
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            
            // 代码块样式
            pre: {
              backgroundColor: 'var(--tw-prose-pre-bg)',
              color: 'var(--tw-prose-pre-code)',
              borderRadius: '3px',
              padding: '16px',
              overflow: 'auto',
              fontSize: '85%',
              lineHeight: '1.45',
              marginTop: '0.8em',
              marginBottom: '0.8em',
              border: '1px solid var(--gh-border)',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              fontSize: '100%',
              fontFamily: 'var(--font-mono)',
              fontWeight: '400',
              color: 'inherit',
              border: 'none',
            },
            
            // 行内代码样式
            code: {
              backgroundColor: 'rgba(175, 184, 193, 0.2)',
              padding: '0.2em 0.4em',
              borderRadius: '3px',
              fontSize: '85%',
              fontWeight: '400',
              fontFamily: 'var(--font-mono)',
            },
            'code::before': {
              content: 'none',
            },
            'code::after': {
              content: 'none',
            },
            
            // 引用样式
            blockquote: {
              fontStyle: 'normal',
              fontWeight: '400',
              color: 'var(--tw-prose-quotes)',
              borderLeftWidth: '4px',
              borderLeftColor: 'var(--tw-prose-quote-borders)',
              quotes: 'none',
              marginTop: '0.8em',
              marginBottom: '0.8em',
              paddingLeft: '1em',
              paddingRight: '1em',
            },
            
            // 列表样式
            ul: {
              marginTop: '0.8em',
              marginBottom: '0.8em',
            },
            ol: {
              marginTop: '0.8em',
              marginBottom: '0.8em',
            },
            'ul > li': {
              paddingLeft: '0.375em',
              marginTop: '0.2em',
              marginBottom: '0.2em',
            },
            'ol > li': {
              paddingLeft: '0.375em',
              marginTop: '0.2em',
              marginBottom: '0.2em',
            },

            // 表格样式 (GitHub 风格)
            table: {
              borderSpacing: '0',
              borderCollapse: 'collapse',
              marginTop: '0.8em',
              marginBottom: '0.8em',
              width: '100%',
              overflow: 'auto',
            },
            'table tr': {
              backgroundColor: 'var(--gh-bg)',
              borderTop: '1px solid var(--gh-quote-border)',
            },
            'table tr:nth-child(2n)': {
              backgroundColor: 'var(--gh-code-bg)',
            },
            'table th': {
              fontWeight: '600',
              border: '1px solid var(--gh-quote-border)',
              padding: '6px 13px',
            },
            'table td': {
              border: '1px solid var(--gh-quote-border)',
              padding: '6px 13px',
            },
            'thead': {
              borderBottom: 'none',
            },
            'thead th': {
              backgroundColor: 'var(--gh-bg)',
            },
          },
        },
      }),
    },
  },
};
export default config;
