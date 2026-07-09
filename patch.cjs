const fs = require('fs');
const path = './src/components/jira/KanbanBoard.astro';
let code = fs.readFileSync(path, 'utf8');

// 1. Props
code = code.replace(
  `  currentSprintId?: string | null;
  workspaceMembers?: any[];
}

const { issues, workspaceId, sprints = [], currentSprintId = null, workspaceMembers = [] } = Astro.props;`,
  `  currentSprintId?: string | null;
  workspaceMembers?: any[];
  userRole?: string;
}

const { issues, workspaceId, sprints = [], currentSprintId = null, workspaceMembers = [], userRole = 'viewer' } = Astro.props;
const canEdit = userRole === 'owner' || userRole === 'editor';`
);

// 2. Data attributes on container
code = code.replace(
  `<div class="flex gap-4 h-full overflow-x-auto pb-4 kanban-container" data-workspace={workspaceId}>`,
  `<div class="flex gap-4 h-full overflow-x-auto pb-4 kanban-container" data-workspace={workspaceId} data-can-edit={canEdit.toString()}>`
);

// 3. canEdit prop on IssueCard
code = code.replace(
  `sprint_id: issue.sprint_id || 'backlog'
          }} />`,
  `sprint_id: issue.sprint_id || 'backlog'
          }} canEdit={canEdit} />`
);

// 4. JS canEdit var
code = code.replace(
  `  const workspaceId = container?.getAttribute('data-workspace');`,
  `  const workspaceId = container?.getAttribute('data-workspace');
  const canEdit = container?.getAttribute('data-can-edit') === 'true';`
);

// 5. Wrap dragstart/dragend in if (canEdit)
code = code.replace(
  `    card.addEventListener('dragstart', (e: any) => {
      e.dataTransfer.setData('text/plain', card.id);
      card.classList.add('opacity-50');
      // Set drag effect
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('opacity-50');
      columns.forEach(c => {
        const content = c.querySelector('.column-content');
        if (content) content.classList.remove('bg-forge-secondary/10');
      });
    });`,
  `    if (canEdit) {
      card.addEventListener('dragstart', (e: any) => {
        e.dataTransfer.setData('text/plain', card.id);
        card.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('opacity-50');
        columns.forEach(c => {
          const content = c.querySelector('.column-content');
          if (content) content.classList.remove('bg-forge-secondary/10');
        });
      });
    }`
);

// 6. Wrap columns.forEach
code = code.replace(
  `  columns.forEach(column => {`,
  `  if (canEdit) {
    columns.forEach(column => {`
);

code = code.replace(
  `          // Omitimos rollback visual para no complicar el script en el entorno actual
        }
      }
    });
  });

  // Check URL for issue parameter to auto-open`,
  `          // Omitimos rollback visual para no complicar el script en el entorno actual
        }
      }
    });
  });
  } // end if canEdit

  // Check URL for issue parameter to auto-open`
);

fs.writeFileSync(path, code);
console.log('Patched correctly');
