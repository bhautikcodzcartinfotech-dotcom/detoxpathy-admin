const escapeXml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const exportToExcel = ({ filename, sheets }) => {
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Detoxpathy</Author>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#334155" />
      <Interior />
      <Borders />
      <NumberFormat />
      <Protection />
    </Style>
    <Style ss:ID="Title">
      <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#134D41" />
      <Alignment ss:Vertical="Center" />
    </Style>
    <Style ss:ID="SubTitle">
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Italic="1" ss:Color="#64748B" />
      <Alignment ss:Vertical="Center" />
    </Style>
    
    <!-- Headers -->
    <Style ss:ID="HeaderB2B">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#134D41" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F3D34" />
      </Borders>
    </Style>
    <Style ss:ID="HeaderB2C">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#0F766E" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#115E59" />
      </Borders>
    </Style>
    <Style ss:ID="HeaderHSN">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#15803D" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#166534" />
      </Borders>
    </Style>
    <Style ss:ID="HeaderLedger">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#134D41" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F3D34" />
      </Borders>
    </Style>
    <Style ss:ID="HeaderTrial">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#0F766E" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#115E59" />
      </Borders>
    </Style>
    <Style ss:ID="HeaderPnL">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#047857" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#065f46" />
      </Borders>
    </Style>
    <Style ss:ID="HeaderBalance">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#15803d" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#166534" />
      </Borders>
    </Style>

    <!-- Cells -->
    <Style ss:ID="CellNormal">
      <Alignment ss:Vertical="Center" ss:WrapText="1" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
      </Borders>
    </Style>
    <Style ss:ID="CellCenter">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
      </Borders>
    </Style>
    <Style ss:ID="CellRight">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0" />
      </Borders>
    </Style>
    <Style ss:ID="CellBoldRight">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0F172A" />
      <Alignment ss:Horizontal="Right" ss:Vertical="Center" />
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
      </Borders>
    </Style>
    <Style ss:ID="CellBoldLeft">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0F172A" />
      <Alignment ss:Horizontal="Left" ss:Vertical="Center" />
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
      </Borders>
    </Style>
    
    <!-- Section / Total rows -->
    <Style ss:ID="CellTotal">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1E293B" />
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid" />
      <Alignment ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#475569" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
      </Borders>
    </Style>
    <Style ss:ID="CellTotalRight">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1E293B" />
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Right" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#475569" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1" />
      </Borders>
    </Style>
    <Style ss:ID="CellNetProfit">
      <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#854D0E" />
      <Interior ss:Color="#FEF9C3" ss:Pattern="Solid" />
      <Alignment ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#854D0E" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EAB308" />
      </Borders>
    </Style>
    <Style ss:ID="CellNetProfitRight">
      <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#854D0E" />
      <Interior ss:Color="#FEF9C3" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Right" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#854D0E" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EAB308" />
      </Borders>
    </Style>
    
    <!-- Section Categories -->
    <Style ss:ID="CellRevenueHeader">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#15803D" />
      <Interior ss:Color="#DCFCE7" ss:Pattern="Solid" />
      <Alignment ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC" />
      </Borders>
    </Style>
    <Style ss:ID="CellExpenseHeader">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C" />
      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid" />
      <Alignment ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5" />
      </Borders>
    </Style>
    <Style ss:ID="CellAssetHeader">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0D9488" />
      <Interior ss:Color="#CCFBF1" ss:Pattern="Solid" />
      <Alignment ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#99F6E4" />
      </Borders>
    </Style>
    <Style ss:ID="CellLiabilityHeader">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#15803D" />
      <Interior ss:Color="#DCFCE7" ss:Pattern="Solid" />
      <Alignment ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0" />
      </Borders>
    </Style>
  </Styles>
`;

  sheets.forEach((sheet) => {
    xml += `  <Worksheet ss:Name="${escapeXml(sheet.name)}">\n`;
    xml += `    <Table>\n`;
    if (sheet.columns) {
      sheet.columns.forEach((col) => {
        xml += `      <Column ss:Width="${col.width || 100}" />\n`;
      });
    }

    sheet.rows.forEach((row) => {
      const heightAttr = row.height ? ` ss:Height="${row.height}"` : "";
      xml += `      <Row${heightAttr}>\n`;
      row.cells.forEach((cell) => {
        const styleAttr = cell.styleId ? ` ss:StyleID="${cell.styleId}"` : "";
        const mergeAttr = cell.mergeAcross ? ` ss:MergeAcross="${cell.mergeAcross}"` : "";
        
        let typeAttr = ' ss:Type="String"';
        let valStr = "";
        
        if (cell.type === "Number") {
          typeAttr = ' ss:Type="Number"';
          valStr = String(cell.value);
        } else if (cell.type === "Boolean") {
          typeAttr = ' ss:Type="Boolean"';
          valStr = cell.value ? "1" : "0";
        } else {
          valStr = cell.value !== null && cell.value !== undefined ? String(cell.value) : "";
        }

        xml += `        <Cell${styleAttr}${mergeAttr}><Data${typeAttr}>${escapeXml(valStr)}</Data></Cell>\n`;
      });
      xml += `      </Row>\n`;
    });

    xml += `    </Table>\n`;
    xml += `    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n`;
    xml += `      <DisplayGridlines />\n`;
    xml += `    </WorksheetOptions>\n`;
    xml += `  </Worksheet>\n`;
  });

  xml += `</Workbook>\n`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
