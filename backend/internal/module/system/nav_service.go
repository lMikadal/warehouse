package system

import (
	"context"
	"strings"

	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
)

type NavNode struct {
	ID       int64             `json:"id"`
	Icon     *string           `json:"icon,omitempty"`
	Path     *string           `json:"path,omitempty"`
	IsDialog bool              `json:"is_dialog,omitempty"`
	Labels   map[string]string `json:"labels"`
	Children []NavNode         `json:"children,omitempty"`
}

type NavResponse struct {
	LandingPath string    `json:"landing_path"`
	Tree        []NavNode `json:"tree"`
}

type NavService struct {
	menus    *MenuRepository
	menuPerm *MenuPermissionRepository
	rbac     *pkgauth.RBAC
}

func NewNavService(menus *MenuRepository, menuPerm *MenuPermissionRepository, rbac *pkgauth.RBAC) *NavService {
	return &NavService{menus: menus, menuPerm: menuPerm, rbac: rbac}
}

type navTreeNode struct {
	row      MenuRow
	children []navTreeNode
}

func (s *NavService) NavForPrincipal(ctx context.Context, p pkgauth.Principal) (*NavResponse, error) {
	viewCodes, err := s.menuPerm.LoadMenuViewCodes(ctx)
	if err != nil {
		return nil, err
	}

	all, err := s.menus.loadAll(ctx)
	if err != nil {
		return nil, err
	}
	active := make([]MenuRow, 0, len(all))
	for _, r := range all {
		if r.IsActive {
			active = append(active, r)
		}
	}
	if err := s.menus.attachNames(ctx, active); err != nil {
		return nil, err
	}
	tree := buildNavTreeNodes(active, nil)
	filtered := filterNavNodes(ctx, s.rbac, p, tree, viewCodes)
	landing := firstNavigablePath(ctx, s.rbac, p, filtered, viewCodes)
	return &NavResponse{LandingPath: landing, Tree: toNavNodes(filtered)}, nil
}

func buildNavTreeNodes(rows []MenuRow, parentID *int64) []navTreeNode {
	siblings := sortMenuSiblings(siblingRows(rows, parentID))
	out := make([]navTreeNode, len(siblings))
	for i, r := range siblings {
		out[i] = navTreeNode{row: r, children: buildNavTreeNodes(rows, &r.ID)}
	}
	return out
}

func siblingRows(rows []MenuRow, parentID *int64) []MenuRow {
	var out []MenuRow
	for _, r := range rows {
		if parentID == nil && r.ParentID == nil {
			out = append(out, r)
		} else if parentID != nil && r.ParentID != nil && *r.ParentID == *parentID {
			out = append(out, r)
		}
	}
	return out
}

func sortMenuSiblings(rows []MenuRow) []MenuRow {
	sorted := append([]MenuRow(nil), rows...)
	for i := 0; i < len(sorted); i++ {
		for j := i + 1; j < len(sorted); j++ {
			if sorted[j].SortOrder < sorted[i].SortOrder ||
				(sorted[j].SortOrder == sorted[i].SortOrder && sorted[j].ID < sorted[i].ID) {
				sorted[i], sorted[j] = sorted[j], sorted[i]
			}
		}
	}
	return sorted
}

type permissionChecker interface {
	HasPermission(ctx context.Context, roleID int64, code string) (bool, error)
}

func filterNavNodes(ctx context.Context, rbac permissionChecker, p pkgauth.Principal, nodes []navTreeNode, viewCodes map[int64]string) []navTreeNode {
	if p.UserType == "superadmin" {
		return nodes
	}
	var out []navTreeNode
	for _, n := range nodes {
		children := filterNavNodes(ctx, rbac, p, n.children, viewCodes)
		leafNav := isNavigablePath(n.row.Path) && !n.row.IsDialog

		if n.row.IsSuperadminOnly {
			if leafNav {
				if !menuViewAllowed(ctx, rbac, p, n.row.ID, viewCodes) {
					continue
				}
			} else if len(children) == 0 {
				continue
			}
			out = append(out, navTreeNode{row: n.row, children: children})
			continue
		}

		if leafNav {
			if !menuViewAllowed(ctx, rbac, p, n.row.ID, viewCodes) {
				continue
			}
		} else if n.row.IsDialog {
			if !menuViewAllowed(ctx, rbac, p, n.row.ID, viewCodes) {
				continue
			}
		} else if len(children) == 0 {
			continue
		}
		out = append(out, navTreeNode{row: n.row, children: children})
	}
	return out
}

func firstNavigablePath(ctx context.Context, rbac permissionChecker, p pkgauth.Principal, nodes []navTreeNode, viewCodes map[int64]string) string {
	for _, n := range nodes {
		if isNavigableLeaf(ctx, rbac, p, n, viewCodes) {
			return strings.TrimSpace(*n.row.Path)
		}
		if sub := firstNavigablePath(ctx, rbac, p, n.children, viewCodes); sub != "" {
			return sub
		}
	}
	return ""
}

func isNavigableLeaf(ctx context.Context, rbac permissionChecker, p pkgauth.Principal, n navTreeNode, viewCodes map[int64]string) bool {
	if !isNavigablePath(n.row.Path) || n.row.IsDialog {
		return false
	}
	if strings.Contains(strings.ToLower(derefStr(n.row.Path)), "dashboard") {
		return false
	}
	if p.UserType == "superadmin" {
		return true
	}
	return menuViewAllowed(ctx, rbac, p, n.row.ID, viewCodes)
}

func menuViewAllowed(ctx context.Context, rbac permissionChecker, p pkgauth.Principal, menuID int64, viewCodes map[int64]string) bool {
	if rbac == nil {
		return false
	}
	code, ok := viewCodes[menuID]
	if !ok || code == "" {
		return false
	}
	if p.RoleID == nil {
		return false
	}
	allowed, err := rbac.HasPermission(ctx, *p.RoleID, code)
	return err == nil && allowed
}

func toNavNodes(nodes []navTreeNode) []NavNode {
	out := make([]NavNode, len(nodes))
	for i, n := range nodes {
		labels := map[string]string{"th": "", "en": ""}
		if n.row.Names != nil {
			labels["th"] = n.row.Names["th"]
			labels["en"] = n.row.Names["en"]
		}
		var path *string
		if isNavigablePath(n.row.Path) && !n.row.IsDialog {
			path = n.row.Path
		}
		out[i] = NavNode{
			ID:       n.row.ID,
			Icon:     n.row.Icon,
			Path:     path,
			IsDialog: n.row.IsDialog,
			Labels:   labels,
			Children: toNavNodes(n.children),
		}
	}
	return out
}

func (s *NavService) LandingPathForUser(ctx context.Context, userType string, roleID *int64) (string, error) {
	p := pkgauth.Principal{UserType: userType, RoleID: roleID}
	nav, err := s.NavForPrincipal(ctx, p)
	if err != nil {
		return "", err
	}
	return nav.LandingPath, nil
}

// FilterNavTreeForTest exposes nav filtering for unit tests.
func FilterNavTreeForTest(ctx context.Context, rbac *pkgauth.RBAC, p pkgauth.Principal, nodes []navTreeNode, viewCodes map[int64]string) []navTreeNode {
	return filterNavNodes(ctx, rbac, p, nodes, viewCodes)
}

// BuildNavTreeNodesForTest builds a nav tree from flat rows (tests).
func BuildNavTreeNodesForTest(rows []MenuRow) []navTreeNode {
	return buildNavTreeNodes(rows, nil)
}
