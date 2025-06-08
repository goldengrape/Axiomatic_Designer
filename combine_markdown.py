import os

# --- 配置 ---
docs_directory = r'c:\Users\golde\code\Axiomatic_Designer\docs'  # docs 目录的绝对路径
output_filename = 'combined_docs.md' # 输出文件名
# -------------

def find_md_files(directory):
    """递归查找指定目录及其子目录下的所有 .md 文件"""
    md_files = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                md_files.append(os.path.join(root, file))
    return sorted(md_files) # 按字典序排序

def combine_markdown_files(md_files, output_file):
    """将多个 markdown 文件合并成一个"""
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for filepath in md_files:
            try:
                with open(filepath, 'r', encoding='utf-8') as infile:
                    content = infile.read()
                    # 从完整路径中提取文件名（不含扩展名）
                    filename_without_ext = os.path.splitext(os.path.basename(filepath))[0]
                    outfile.write(f'## {filename_without_ext}\n\n')
                    outfile.write(content)
                    outfile.write('\n\n---\n\n') # 添加分隔符，可选
                print(f"Processed: {filepath}")
            except Exception as e:
                print(f"Error processing file {filepath}: {e}")
    print(f"\nSuccessfully combined markdown files into: {output_file}")

if __name__ == '__main__':
    if not os.path.isdir(docs_directory):
        print(f"Error: The directory '{docs_directory}' does not exist.")
    else:
        markdown_files = find_md_files(docs_directory)
        if markdown_files:
            combine_markdown_files(markdown_files, output_filename)
        else:
            print(f"No .md files found in '{docs_directory}' or its subdirectories.")