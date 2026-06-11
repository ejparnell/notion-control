import TableView, {
    type TableColumn,
} from '@/components/shared/data-display/TableView';
import {
    EmptyCell,
    AgentAssigneePill,
    PageTitleCell,
    PriorityPill,
    StatusPill,
} from '@/components/shared/data-display/TableCells';
import {
    DateIcon,
    ClockIcon,
    SelectIcon,
    StatusIcon,
    TextIcon,
} from '@/components/svg';
import { ProjectInterface } from '@/lib/types/project';
import { cn, formatDate } from '@/lib/helper/client';

type ProjectTableItem = ProjectInterface

function getTagBadgeStyle(tag: string) {
    const normalizedTag = tag.toLowerCase();

    if (
        normalizedTag.includes('client') ||
        normalizedTag.includes('ai') ||
        normalizedTag.includes('agent') ||
        normalizedTag.includes('automation')
    ) {
        return 'border-secondary/40 bg-secondary-soft text-secondary';
    }

    if (
        normalizedTag.includes('work') ||
        normalizedTag.includes('frontend') ||
        normalizedTag.includes('ui') ||
        normalizedTag.includes('design')
    ) {
        return 'border-primary/40 bg-primary-soft text-primary';
    }

    if (
        normalizedTag.includes('personal') ||
        normalizedTag.includes('backend') ||
        normalizedTag.includes('api') ||
        normalizedTag.includes('data')
    ) {
        return 'border-accent/40 bg-accent-soft text-accent';
    }

    if (normalizedTag.includes('urgent')) {
        return 'border-danger/40 bg-danger-soft text-danger';
    }

    return 'border-border bg-surface-soft text-muted';
}

const columns: TableColumn<ProjectTableItem>[] = [
    {
        id: 'name',
        header: 'Project name',
        icon: <TextIcon />,
        width: 350,
        render: (project) => <PageTitleCell name={project.name} id={project.id} />,
    },
    {
        id: 'summary',
        header: 'Summary',
        icon: <TextIcon />,
        width: 350,
        render: (project) =>
            project.summary ? (
                <span className="text-foreground">{project.summary}</span>
            ) : (
                <EmptyCell />
            ),
    },
    {
        id: 'status',
        header: 'Status',
        icon: <StatusIcon />,
        width: 150,
        render: (project) => <StatusPill value={project.status ?? null} />,
    },
    {
        id: 'priority',
        header: 'Priority',
        icon: <SelectIcon />,
        width: 150,
        render: (project) => <PriorityPill value={project.priority ?? null} />,
    },
    {
        id: 'startDate',
        header: 'Start Date',
        icon: <DateIcon />,
        width: 150,
        render: (project) =>
            project.startDate ? (
                <span className="text-foreground">{formatDate(project.startDate)}</span>
            ) : (
                <EmptyCell />
            ),
    },
    {
        id: 'endDate',
        header: 'End Date',
        icon: <DateIcon />,
        width: 150,
        render: (project) =>
            project.endDate ? (
                <span className="text-foreground">{formatDate(project.endDate)}</span>
            ) : (
                <EmptyCell />
            ),
    },
    {
        id: 'estTime',
        header: 'Est. time',
        icon: <ClockIcon />,
        width: 120,
        render: (project) =>
            project.estTime != null ? (
                <span className="text-foreground">{project.estTime}h</span>
            ) : (
                <EmptyCell />
            ),
    },
    {
        id: 'assignedTo',
        header: 'Assigned to',
        icon: <SelectIcon />,
        width: 150,
        render: (project) => <AgentAssigneePill value={project.assignedTo ?? null} />,
    },
    {
        id: 'tags',
        header: 'Tags',
        icon: <SelectIcon />,
        width: 150,
        render: (project) =>
            project.tags?.length ? (
                <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                        <span
                            key={tag}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm font-medium',
                                getTagBadgeStyle(tag),
                            )}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            ) : (
                <EmptyCell />
            ),
    },
];

export default function ProjectTableView({
    projects,
}: {
    projects: ProjectTableItem[];
}) {
    return <TableView items={projects} columns={columns} />;
}
