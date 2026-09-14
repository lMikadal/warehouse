package tree

import (
	"fmt"
	"strconv"
	"strings"
)

// BuildPath materializes an LTREE label chain n{id}.n{id}... from parent links.
func BuildPath(id int64, parentID *int64, parentByID map[int64]*int64) (string, error) {
	chain := []int64{id}
	seen := map[int64]bool{id: true}
	var p *int64 = parentID
	for p != nil {
		if seen[*p] {
			return "", fmt.Errorf("cycle")
		}
		seen[*p] = true
		chain = append([]int64{*p}, chain...)
		next := parentByID[*p]
		p = next
	}
	parts := make([]string, len(chain))
	for i, n := range chain {
		parts[i] = "n" + strconv.FormatInt(n, 10)
	}
	return strings.Join(parts, "."), nil
}

// RecomputePaths rebuilds TreePath for every node from ParentID links.
func RecomputePaths(nodes []Node) ([]Node, error) {
	parentByID := make(map[int64]*int64, len(nodes))
	for _, r := range nodes {
		pid := r.ParentID
		parentByID[r.ID] = pid
	}
	out := make([]Node, len(nodes))
	for i, r := range nodes {
		path, err := BuildPath(r.ID, r.ParentID, parentByID)
		if err != nil {
			return nil, err
		}
		r.TreePath = path
		out[i] = r
	}
	return out, nil
}
