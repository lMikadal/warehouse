package setting

import "context"

// FilePurger removes system_file rows and object storage when nothing references them.
type FilePurger interface {
	DeleteIfUnreferenced(ctx context.Context, fileID, actorID int64) error
}
