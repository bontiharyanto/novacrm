import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type {
  DeliveryReportActivity,
  DeliveryReportData,
  DeliveryReportOverdueTask,
  DeliveryReportProject,
} from '@/lib/delivery/report';

const HEADER_BLUE = 'FF2563EB';
const ZEBRA = 'FFF4F4F5';
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function deliveryReportFilename(format: 'csv' | 'xlsx' | 'pdf') {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `novacrm-delivery-report-${date}.${format}`;
}

export function deliveryReportToCsv(report: DeliveryReportData) {
  const header = 'section,project,account,status,progress,planned_end,phase,phase_status,task_count,completed_tasks,open_tasks,overdue_tasks,work_order,task,activity_kind,activity_body,activity_actor,activity_created_at'.split(
    ',',
  );
  const lines: Array<Array<string | number | undefined>> = [
    header,
    ...report.projects.flatMap((project) => [
      [
        'project',
        project.name,
        project.accountName,
        project.status,
        project.progress,
        project.plannedEnd,
        '',
        '',
        project.taskCount,
        project.completedTasks,
        project.openTasks,
        project.overdueTasks,
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      ...project.phases.map((phase) => [
        'phase',
        project.name,
        project.accountName,
        '',
        '',
        '',
        phase.title,
        phase.status,
        phase.taskCount,
        phase.completedTasks,
        phase.openTasks,
        phase.overdueTasks,
        '',
        '',
        '',
        '',
        '',
        '',
      ]),
      ...project.workOrders.map((workOrder) => [
        'work_order',
        project.name,
        project.accountName,
        workOrder.status,
        '',
        '',
        '',
        '',
        workOrder.taskCount,
        workOrder.completedTasks,
        workOrder.openTasks,
        '',
        workOrder.number,
        workOrder.title,
        '',
        '',
        '',
        '',
      ]),
    ]),
    ...report.overdueTasks.map((task) => [
      'overdue_task',
      task.projectName,
      '',
      task.status,
      '',
      task.plannedEnd,
      '',
      '',
      '',
      '',
      '',
      '',
      task.workOrderNumber,
      task.title,
      '',
      '',
      task.assigneeName,
      '',
    ]),
    ...report.recentActivities.map((activity) => [
      'activity',
      activity.projectName,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      activity.workOrderNumber,
      activity.taskTitle,
      activity.kind,
      activity.body,
      activity.actorName,
      activity.createdAt,
    ]),
  ];

  return `${lines.map((line) => line.map(csvEscape).join(',')).join('\n')}\n`;
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BLUE } };
  row.alignment = { vertical: 'middle' };
  row.height = 20;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount },
  };
}

function zebraRows(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row, index) => {
    if (index === 1 || index % 2 !== 0) return;
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
  });
}

function addRowsSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Array<{ header: string; key: string; width: number }>,
  rows: Array<Record<string, unknown>>,
) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  rows.forEach((row) => sheet.addRow(row));
  styleHeader(sheet);
  zebraRows(sheet);
}

export async function deliveryReportToXlsx(report: DeliveryReportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NovaCRM';
  workbook.company = 'NovaCRM';
  workbook.created = new Date(report.generatedAt);
  workbook.modified = new Date(report.generatedAt);

  addRowsSheet(
    workbook,
    'Summary',
    [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 18 },
    ],
    [
      { metric: 'Generated', value: report.generatedAt },
      { metric: 'Total projects', value: report.metrics.totalProjects },
      { metric: 'Average progress (%)', value: report.metrics.averageProgress },
      { metric: 'Open Work Orders', value: report.metrics.openWorkOrders },
      { metric: 'Open tasks', value: report.metrics.openTasks },
      { metric: 'Overdue tasks', value: report.metrics.overdueTasks },
      { metric: 'Blocked phases', value: report.metrics.blockedPhases },
      { metric: 'Unassigned tasks', value: report.metrics.unassignedTasks },
      { metric: 'Handovers pending', value: report.metrics.handoversPending },
      { metric: 'Projects in hypercare', value: report.metrics.hypercareProjects },
    ],
  );

  addRowsSheet(
    workbook,
    'Projects',
    [
      { header: 'Project', key: 'project', width: 30 },
      { header: 'Account', key: 'account', width: 24 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Progress (%)', key: 'progress', width: 14 },
      { header: 'Planned end', key: 'plannedEnd', width: 16 },
      { header: 'Phases', key: 'phaseCount', width: 10 },
      { header: 'Completed phases', key: 'completedPhases', width: 16 },
      { header: 'Blocked phases', key: 'blockedPhases', width: 15 },
      { header: 'Tasks', key: 'taskCount', width: 10 },
      { header: 'Completed tasks', key: 'completedTasks', width: 16 },
      { header: 'Open tasks', key: 'openTasks', width: 12 },
      { header: 'Overdue tasks', key: 'overdueTasks', width: 14 },
      { header: 'Unassigned tasks', key: 'unassignedTasks', width: 16 },
      { header: 'Handover', key: 'handoverStatus', width: 20 },
      { header: 'Handover progress (%)', key: 'handoverProgress', width: 21 },
      { header: 'Hypercare end', key: 'hypercareEnd', width: 16 },
    ],
    report.projects.map((project) => ({
      project: project.name,
      account: project.accountName ?? '',
      status: project.status,
      progress: project.progress,
      plannedEnd: project.plannedEnd ?? '',
      phaseCount: project.phaseCount,
      completedPhases: project.completedPhases,
      blockedPhases: project.blockedPhases,
      taskCount: project.taskCount,
      completedTasks: project.completedTasks,
      openTasks: project.openTasks,
      overdueTasks: project.overdueTasks,
      unassignedTasks: project.unassignedTasks,
      handoverStatus: project.handoverStatus ?? 'not_started',
      handoverProgress: project.handoverProgress ?? '',
      hypercareEnd: project.hypercareEnd ?? '',
    })),
  );

  addRowsSheet(
    workbook,
    'Phases',
    [
      { header: 'Project', key: 'project', width: 30 },
      { header: 'Phase', key: 'phase', width: 42 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Planned end', key: 'plannedEnd', width: 16 },
      { header: 'Tasks', key: 'taskCount', width: 10 },
      { header: 'Completed tasks', key: 'completedTasks', width: 16 },
      { header: 'Open tasks', key: 'openTasks', width: 12 },
      { header: 'Overdue tasks', key: 'overdueTasks', width: 14 },
    ],
    report.projects.flatMap((project) =>
      project.phases.map((phase) => ({
        project: project.name,
        phase: phase.title,
        status: phase.status,
        plannedEnd: phase.plannedEnd ?? '',
        taskCount: phase.taskCount,
        completedTasks: phase.completedTasks,
        openTasks: phase.openTasks,
        overdueTasks: phase.overdueTasks,
      })),
    ),
  );

  addRowsSheet(
    workbook,
    'Work Orders',
    [
      { header: 'Project', key: 'project', width: 30 },
      { header: 'Number', key: 'number', width: 18 },
      { header: 'Title', key: 'title', width: 42 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Tasks', key: 'taskCount', width: 10 },
      { header: 'Completed tasks', key: 'completedTasks', width: 16 },
      { header: 'Open tasks', key: 'openTasks', width: 12 },
    ],
    report.projects.flatMap((project) =>
      project.workOrders.map((workOrder) => ({
        project: project.name,
        number: workOrder.number,
        title: workOrder.title,
        status: workOrder.status,
        taskCount: workOrder.taskCount,
        completedTasks: workOrder.completedTasks,
        openTasks: workOrder.openTasks,
      })),
    ),
  );

  addRowsSheet(
    workbook,
    'Overdue tasks',
    [
      { header: 'Project', key: 'project', width: 30 },
      { header: 'Work Order', key: 'workOrder', width: 18 },
      { header: 'Task', key: 'task', width: 42 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Planned end', key: 'plannedEnd', width: 16 },
      { header: 'Assignee', key: 'assignee', width: 24 },
    ],
    report.overdueTasks.map((task) => ({
      project: task.projectName,
      workOrder: task.workOrderNumber ?? '',
      task: task.title,
      status: task.status,
      plannedEnd: task.plannedEnd,
      assignee: task.assigneeName ?? 'Unassigned',
    })),
  );

  addRowsSheet(
    workbook,
    'Activity',
    [
      { header: 'Created at', key: 'createdAt', width: 24 },
      { header: 'Project', key: 'project', width: 30 },
      { header: 'Work Order', key: 'workOrder', width: 18 },
      { header: 'Task', key: 'task', width: 42 },
      { header: 'Kind', key: 'kind', width: 18 },
      { header: 'Activity', key: 'body', width: 60 },
      { header: 'Actor', key: 'actor', width: 24 },
    ],
    report.recentActivities.map((activity) => ({
      createdAt: activity.createdAt,
      project: activity.projectName,
      workOrder: activity.workOrderNumber ?? '',
      task: activity.taskTitle,
      kind: activity.kind,
      body: activity.body,
      actor: activity.actorName ?? 'System',
    })),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function drawTable(
  doc: PDFKit.PDFDocument,
  y: number,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
) {
  const headerHeight = 20;
  const rowHeight = 18;

  const ensureSpace = (needed: number) => {
    if (y + needed <= PAGE_HEIGHT - MARGIN) return;
    doc.addPage();
    y = MARGIN;
  };

  ensureSpace(headerHeight + rowHeight);
  doc.save();
  doc.rect(MARGIN, y, CONTENT_WIDTH, headerHeight).fill('#2563eb');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
  let x = MARGIN + 6;
  headers.forEach((header, index) => {
    doc.text(header, x, y + 6, { width: columnWidths[index] - 10, lineBreak: false });
    x += columnWidths[index];
  });
  doc.restore();
  y += headerHeight;

  rows.forEach((row, rowIndex) => {
    ensureSpace(rowHeight);
    if (rowIndex % 2 === 0) {
      doc.save();
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill('#f4f4f5');
      doc.restore();
    }
    doc.font('Helvetica').fontSize(8).fillColor('#3f3f46');
    x = MARGIN + 6;
    row.forEach((cell, cellIndex) => {
      doc.text(cell, x, y + 5, { width: columnWidths[cellIndex] - 10, lineBreak: false, ellipsis: true });
      x += columnWidths[cellIndex];
    });
    y += rowHeight;
  });

  return y;
}

function projectRows(projects: DeliveryReportProject[]) {
  return projects.map((project) => [
    project.name,
    project.status,
    `${project.progress}%`,
    `${project.completedTasks}/${project.taskCount}`,
    String(project.overdueTasks),
    project.handoverStatus ?? 'not_started',
  ]);
}

function overdueRows(tasks: DeliveryReportOverdueTask[]) {
  return tasks.map((task) => [
    task.projectName,
    task.workOrderNumber ?? '—',
    task.title,
    task.status,
    task.plannedEnd,
    task.assigneeName ?? 'Unassigned',
  ]);
}

function activityRows(activities: DeliveryReportActivity[]) {
  return activities.map((activity) => [
    activity.projectName,
    activity.taskTitle,
    activity.kind,
    activity.body,
    activity.actorName ?? 'System',
    activity.createdAt.slice(0, 16).replace('T', ' '),
  ]);
}

export async function deliveryReportToPdf(report: DeliveryReportData) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: { Title: 'NovaCRM Delivery report', Author: 'NovaCRM' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = MARGIN;
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#18181b').text('Delivery report', MARGIN, y);
    y += 26;
    doc.font('Helvetica').fontSize(9).fillColor('#71717a').text(
      `NovaCRM · Generated ${report.generatedAt.slice(0, 16).replace('T', ' ')}`,
      MARGIN,
      y,
      { width: CONTENT_WIDTH },
    );
    y += 26;

    const metricEntries = [
      ['Projects', report.metrics.totalProjects],
      ['Average progress', `${report.metrics.averageProgress}%`],
      ['Open Work Orders', report.metrics.openWorkOrders],
      ['Open tasks', report.metrics.openTasks],
      ['Overdue tasks', report.metrics.overdueTasks],
      ['Pending handovers', report.metrics.handoversPending],
      ['In hypercare', report.metrics.hypercareProjects],
    ];
    const boxGap = 8;
    const boxWidth = (CONTENT_WIDTH - boxGap * (metricEntries.length - 1)) / metricEntries.length;
    metricEntries.forEach(([label, value], index) => {
      const x = MARGIN + index * (boxWidth + boxGap);
      doc.save();
      doc.roundedRect(x, y, boxWidth, 42, 5).lineWidth(0.6).strokeColor('#d4d4d8').stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#71717a').text(String(label).toUpperCase(), x + 8, y + 8, {
        width: boxWidth - 16,
        lineBreak: false,
      });
      doc.font('Helvetica-Bold').fontSize(15).fillColor('#18181b').text(String(value), x + 8, y + 21, {
        width: boxWidth - 16,
        lineBreak: false,
      });
      doc.restore();
    });
    y += 58;

    const section = (title: string) => {
      if (y > PAGE_HEIGHT - 80) {
        doc.addPage();
        y = MARGIN;
      }
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#18181b').text(title, MARGIN, y);
      y += 16;
    };

    section('Project portfolio');
    y = drawTable(doc, y, ['Project', 'Status', 'Progress', 'Tasks', 'Overdue', 'Handover'], projectRows(report.projects), [
      250,
      90,
      75,
      75,
      75,
      CONTENT_WIDTH - 565,
    ]);

    y += 14;
    section('Overdue task queue');
    y = drawTable(doc, y, ['Project', 'Work Order', 'Task', 'Status', 'Planned end', 'Assignee'], overdueRows(report.overdueTasks), [
      150,
      90,
      260,
      80,
      90,
      CONTENT_WIDTH - 670,
    ]);

    y += 14;
    section('Recent activity');
    drawTable(doc, y, ['Project', 'Task', 'Kind', 'Activity', 'Actor', 'Created'], activityRows(report.recentActivities), [
      105,
      115,
      70,
      330,
      80,
      CONTENT_WIDTH - 700,
    ]);

    const pages = doc.bufferedPageRange();
    for (let index = 0; index < pages.count; index += 1) {
      doc.switchToPage(index);
      doc.save();
      doc.rect(0, 0, PAGE_WIDTH, 5).fill('#3b82f6');
      doc.font('Helvetica').fontSize(8).fillColor('#a1a1aa');
      doc.text('NovaCRM · Delivery report', MARGIN, PAGE_HEIGHT - 22, { width: 240, lineBreak: false });
      doc.text(`${index + 1} / ${pages.count}`, MARGIN, PAGE_HEIGHT - 22, { width: CONTENT_WIDTH, align: 'right' });
      doc.restore();
    }

    doc.end();
  });
}

export function deliveryReportContentType(format: 'csv' | 'xlsx' | 'pdf') {
  if (format === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (format === 'pdf') return 'application/pdf';
  return 'text/csv; charset=utf-8';
}
