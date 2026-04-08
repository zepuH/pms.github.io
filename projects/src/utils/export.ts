import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// 将 oklch() 和 lab() 颜色转换为 rgb() 格式
function convertLabColors(clonedDoc: Document): void {
  // 获取所有元素（包括 SVG）
  const allElements = clonedDoc.querySelectorAll('*');

  // 匹配 oklch() 或 lab() 颜色函数
  const colorFnRegex = /(oklch|lab)\([^)]+\)/gi;

  allElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    const svgElement = element as SVGElement;

    // 方法1: 直接检查和替换内联样式中的 oklch()/lab()
    const inlineStyle = htmlElement.getAttribute('style');
    if (inlineStyle && colorFnRegex.test(inlineStyle)) {
      // 移除所有包含 oklch()/lab() 的样式声明
      const cleanedStyle = inlineStyle
        .split(';')
        .map((rule) => {
          if (colorFnRegex.test(rule.trim())) {
            // 移除这个样式规则
            return '';
          }
          return rule;
        })
        .filter((rule) => rule.trim())
        .join(';');

      if (cleanedStyle) {
        htmlElement.setAttribute('style', cleanedStyle);
      } else {
        htmlElement.removeAttribute('style');
      }
    }

    // 方法2: 处理 SVG 元素的所有颜色属性
    if (element instanceof SVGElement) {
      // 移除 fill 属性中的 oklch()/lab()
      const fill = svgElement.getAttribute('fill');
      if (fill && colorFnRegex.test(fill)) {
        svgElement.setAttribute('fill', '#000000');
      }

      // 移除 stroke 属性中的 oklch()/lab()
      const stroke = svgElement.getAttribute('stroke');
      if (stroke && colorFnRegex.test(stroke)) {
        svgElement.setAttribute('stroke', '#000000');
      }

      // 移除 fill-opacity, stroke-opacity 等属性中的 oklch()/lab()
      ['fill-opacity', 'stroke-opacity', 'stop-color', 'flood-color', 'lighting-color'].forEach((attr) => {
        const value = svgElement.getAttribute(attr);
        if (value && colorFnRegex.test(value)) {
          svgElement.setAttribute(attr, '#000000');
        }
      });
    }

    // 方法3: 强制覆盖常用的颜色属性
    const computedStyle = clonedDoc.defaultView?.getComputedStyle(htmlElement);
    if (computedStyle) {
      const properties = [
        { name: 'color', fallback: '#000000' },
        { name: 'background-color', fallback: '#ffffff' },
        { name: 'border-color', fallback: '#e2e8f0' },
        { name: 'border-top-color', fallback: '#e2e8f0' },
        { name: 'border-right-color', fallback: '#e2e8f0' },
        { name: 'border-bottom-color', fallback: '#e2e8f0' },
        { name: 'border-left-color', fallback: '#e2e8f0' },
        { name: 'outline-color', fallback: '#000000' },
        { name: 'text-decoration-color', fallback: '#000000' },
        { name: 'column-rule-color', fallback: '#e2e8f0' },
      ];

      properties.forEach(({ name, fallback }) => {
        const value = computedStyle.getPropertyValue(name);
        if (value && colorFnRegex.test(value)) {
          htmlElement.style.setProperty(name, fallback, 'important');
        }
      });
    }
  });
}

// 导出为PNG图片
export async function exportToPNG(elementId: string, filename: string = 'dashboard.png'): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error('未找到要导出的元素');
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 提高清晰度
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // 转换不支持的 lab() 颜色
        convertLabColors(clonedDoc);
      },
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('导出PNG失败:', error);
    throw error;
  }
}

// 导出为PDF
export async function exportToPDF(elementId: string, filename: string = 'dashboard.pdf'): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error('未找到要导出的元素');
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 提高清晰度
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // 转换不支持的 lab() 颜色
        convertLabColors(clonedDoc);
      },
    });

    const imgData = canvas.toDataURL('image/png');

    // 计算PDF尺寸
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4纸尺寸（毫米）
    const pdfWidth = 210;
    const pdfHeight = 297;

    // 计算缩放比例
    const ratio = Math.min(pdfWidth / (imgWidth * 0.264583), pdfHeight / (imgHeight * 0.264583));

    const finalWidth = imgWidth * 0.264583 * ratio;
    const finalHeight = imgHeight * 0.264583 * ratio;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const xPos = (pdfWidth - finalWidth) / 2;
    const yPos = (pdfHeight - finalHeight) / 2;

    pdf.addImage(imgData, 'PNG', xPos, yPos, finalWidth, finalHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('导出PDF失败:', error);
    throw error;
  }
}
